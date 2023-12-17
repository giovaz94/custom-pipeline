import {addInQueue, closeConnection, startConsumer} from "./queue/queue";
import axios from "axios";

const queueName = process.env.QUEUE_NAME || 'imageanalyzer.queue';
const interval = 1000/parseInt(process.env.MCL as string, 10);
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';

type analysisCheck = { recognizerCheck: Boolean, NSFWCheck: Boolean };
const imageAnalysisRequests = new Map<string, analysisCheck>();

const queueTypeImageRecognizer = process.env.QUEUE_IMAGE_RECOGNIZER || 'imagerec.req';
const queueTypeNsfwDetector = process.env.QUEUE_IMAGE_RECOGNIZER || 'nsfwdet.req';
const queueTypeMessageAnalyzer = process.env.QUEUE_IMAGE_RECOGNIZER || 'messageanalyzer.req';
const dbUrl = process.env.DB_URL || 'http://localhost:3200';

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

startConsumer(queueName, async (task) => {
    console.log(` ~[*] New request received!`);
    let id;
    if(typeof task.data === 'string') {
        id = task.data;
        await sleep(interval);
        imageAnalysisRequests.set(task.data, { recognizerCheck: false, NSFWCheck: false });
        const taskToSend = {
            data: id,
            time: new Date().toISOString()
        }
        try {
            await addInQueue(exchangeName, queueTypeImageRecognizer, taskToSend);
            await addInQueue(exchangeName, queueTypeNsfwDetector, taskToSend);
        } catch (error: any) {
            console.log(` ~[X] Error submitting the request to the queue: ${error.message}`);
            return;
        }
        console.log(` ~[!] Request to sub-services handled successfully!`);

    } else if("response" in task.data && imageAnalysisRequests.has(task.data.id)) {
        let analysis = imageAnalysisRequests.get(task.data.id) as analysisCheck
        if(task.data.type === "imageRecognizer") {
            analysis.recognizerCheck = true;
            console.log(` ~[!] imageRecognizer response received for ${task.data.id}!`);
        } else if(task.data.type=== "nsfwDetector") {
            analysis.NSFWCheck = true;
            console.log(` ~[!] nsfwDetector response received for ${task.data.id}!`);
        }
        if(analysis.recognizerCheck && analysis.NSFWCheck) {
            id = task.data.id;
            imageAnalysisRequests.delete(id);
            try {
                const taskToSend = {
                    data: id,
                    time: new Date().toISOString()
                }
                await addInQueue(exchangeName, queueTypeMessageAnalyzer, taskToSend);
            } catch (error: any) {
                console.log(` ~[X] Error submitting the request to the queue: ${error.message}`);
                return
            }
            console.log(` ~[!] Request handled successfully!`);
        }
    }

});

process.on('SIGINT', () => {
    console.log(' [*] Exiting...');
    closeConnection();
    process.exit(0);
});
