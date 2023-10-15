import {addInQueue, startConsumer} from "./queue/queue";

const queueName = process.env.QUEUE_NAME || 'imagerec.queue';
const interval = 1000/parseInt(process.env.MCL as string, 10);

const queueTypeImageAnalyzer = process.env.QUEUE_IMAGE_ANALYZER || 'imageanalyzer.req';

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

startConsumer(queueName, async (task) => {
    console.log(` ~ [*] Received a new request wit id ${task.data}`);
    await sleep(interval);
    addInQueue('pipeline.direct', 'imageanalyzer.req', {
        data: {response: "Image recognized", id: task.data, type: "imageRecognizer"},
        time: new Date().toISOString(),
    });
    console.log(` ~ [!] Done processing image with id ${task.data}`);
});

