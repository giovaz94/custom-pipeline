import {addInQueue, closeConnection, startConsumer} from "./queue/queue";
import express, { Application } from 'express';
import * as prometheus from 'prom-client';
const queueName = process.env.QUEUE_NAME || 'nsfwdet.queue';
const interval = 1000/parseInt(process.env.MCL as string, 10);

const queueTypeImageAnalyzer = process.env.QUEUE_IMAGE_ANALYZER || 'imageanalyzer.req';


let requestCounter = 0;
let lastRequestTime = new Date().getTime();

const app: Application = express();
const port: string | 8005 = process.env.PORT || 8005;

app.listen(port, () => {
    console.log(`Nsfw detector service launched ad http://localhost:${port}`);
});

const requests = new prometheus.Counter({
    name: 'http_requests_total_image_recognizer',
    help: 'Total number of HTTP requests',
});

const requestsTotalTime = new prometheus.Counter({
    name: 'http_response_time_sum',
    help: 'Response time sum'
})

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

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

startConsumer(queueName, (task) => {
    const dateStart = new Date();
    requests.inc();
    sleep(interval).then(() => {
        addInQueue('pipeline.direct', queueTypeImageAnalyzer, {
            data: {response: "NSFW checked", id: task.data, type: "nsfwDetector"},
            time: new Date().toISOString(),
        }, messageLost);
    }).finally(() => {
        const dateEnd = new Date();
        const secondsDifference = dateEnd.getTime() - dateStart.getTime();
        requestsTotalTime.inc(secondsDifference);
    });
});

process.on('SIGINT', () => {
    console.log(' [*] Exiting...');
    closeConnection();
    process.exit(0);
});
