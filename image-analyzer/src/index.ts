import {addInQueue, closeConnection, startConsumer} from "./queue/queue";
import express, { Application } from 'express';
import * as prometheus from 'prom-client';

const app: Application = express();
const port: string | 8003 = process.env.PORT || 8003;

const queueName = process.env.QUEUE_NAME || 'imageanalyzer.queue';
const interval = 1000/parseInt(process.env.MCL as string, 10);
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';

type analysisCheck = { recognizerCheck: Boolean, NSFWCheck: Boolean };
const imageAnalysisRequests = new Map<string, analysisCheck>();

const queueTypeImageRecognizer = process.env.QUEUE_IMAGE_RECOGNIZER || 'imagerec.req';
const queueTypeNsfwDetector = process.env.QUEUE_IMAGE_RECOGNIZER || 'nsfwdet.req';
const queueTypeMessageAnalyzer = process.env.QUEUE_IMAGE_RECOGNIZER || 'messageanalyzer.req';


const requests = new prometheus.Counter({
    name: 'http_requests_total_image_analyzer',
    help: 'Total number of HTTP requests',
});

const requestsTotalTime = new prometheus.Counter({
    name: 'http_response_time_sum',
    help: 'Response time sum'
});

const messageLost = new prometheus.Counter({
    name: 'services_message_lost',
    help: 'Number of messages lost'
});

app.get('/metrics', (req, res) => {
    prometheus.register.metrics()
        .then(metrics => {
            res.set('Content-Type', prometheus.contentType);
            res.end(metrics);
        })
        .catch(error => {
            console.error("Error:", error);
            res.status(500).end("Internal Server Error");
        });
});

app.post("/response", (req, res) => {

    //
    const response = req.body.response;
    const id = response.message_id;


    // Prendo dal db il record con message_id = id
    // NSFWDetectorCheck ImageRecCheck --> booleani

    // Check se entrambi sono true
    // Se si, invio il messaggio al message-analyzer
    // Altrimenti valorizzo il campo del db con il check corrispondente

});

app.listen(port, () => {
    console.log(`Message parser service launched ad http://localhost:${port}`);
});
function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

startConsumer(queueName, (task) => {
    let id;
    const dateStart = new Date();
    requests.inc();
    console.log(imageAnalysisRequests);
    if(typeof task.data === 'string') {
        sleep(interval).then(() => {
            imageAnalysisRequests.set(
                task.data + "_" + task.att_number,
                { recognizerCheck: false, NSFWCheck: false }

            );
            const taskToSend = {
                data: task.data,
                time: new Date().toISOString(),
                att_number: task.att_number
            }
            addInQueue(exchangeName, queueTypeImageRecognizer, taskToSend, messageLost);
            addInQueue(exchangeName, queueTypeNsfwDetector, taskToSend, messageLost);
        }).finally(() => {
            const dateEnd = new Date();
            const secondsDifference = dateEnd.getTime() - dateStart.getTime();
            requestsTotalTime.inc(secondsDifference);
        })
    } else if("response" in task.data && imageAnalysisRequests.has(task.data.id + "_" + task.att_number)) {
        let id = task.data.id + "_" + task.att_number
        let analysis = imageAnalysisRequests.get(id) as analysisCheck
        if(task.data.type === "imageRecognizer") {
            analysis.recognizerCheck = true;
        } else if(task.data.type=== "nsfwDetector") {
            analysis.NSFWCheck = true;
        }

        if(analysis.recognizerCheck && analysis.NSFWCheck) {
            console.log(`Image analysis completed for ${id}`)
            imageAnalysisRequests.delete(id);
            const taskToSend = {
                data: task.data.id,
                time: new Date().toISOString(),
                att_number: task.att_number
            }
            addInQueue(exchangeName, queueTypeMessageAnalyzer, taskToSend, messageLost);
        }
    }

});

process.on('SIGINT', () => {
    console.log(' [*] Exiting...');
    closeConnection();
    process.exit(0);
});
