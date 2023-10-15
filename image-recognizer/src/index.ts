import {addInQueue, startConsumer} from "./queue/queue";

const queueName = process.env.QUEUE_NAME || 'imagerec.queue';
const interval = 1000/parseInt(process.env.MCL as string, 10);

const queueTypeImageAnalyzer = process.env.QUEUE_IMAGE_ANALYZER || 'imageanalyzer.req';

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

startConsumer(queueName, async (task) => {
    console.log(` ~ [*] Received a new request wit id ${task.data}`);
    try {
        await sleep(interval);
        addInQueue('pipeline.direct', queueTypeImageAnalyzer, {
            data: {response: "Image recognized", id: task.data, type: "imageRecognizer"},
            time: new Date().toISOString(),
        });
        console.log(` ~ [!] Done processing image with id ${task.data}`);
    } catch (error: any) {
        console.log(` ~ [X] Error submitting the request to the queue: ${error.message}`);
        return;
    }

});

