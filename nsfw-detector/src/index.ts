import {addInQueue, closeConnection, startConsumer} from "./queue/queue";
import express, {Request, Response , Application } from 'express';
import RequestCounter from "./req-counter/req.counter";

const queueName = process.env.QUEUE_NAME || 'nsfwdet.queue';
const interval = 1000/parseInt(process.env.MCL as string, 10);

const queueTypeImageAnalyzer = process.env.QUEUE_IMAGE_ANALYZER || 'imageanalyzer.req';


let requestCounter = 0;
let lastRequestTime = new Date().getTime();

const app: Application = express();
const port: string | 8005 = process.env.PORT || 8005;

app.listen(port, () => {
    console.log(`Message parser service launched ad http://localhost:${port}`);
});

app.get('/inbound-workload', async (req: Request, res: Response) => {
    const now = new Date().getTime();
    const secondsElapsed = (now - lastRequestTime) / 1000;
    const inboundWorkload = RequestCounter.getInstance().getCount() / secondsElapsed;

    lastRequestTime = new Date().getTime();
    RequestCounter.getInstance().reset();
    return res.status(200).send({
        inboundWorkload: inboundWorkload
    });
});


function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

startConsumer(queueName, async (task) => {
    console.log(` ~ [*] Received a new request wit id ${task.data}`);
    try {
        await sleep(interval);
        addInQueue('pipeline.direct', queueTypeImageAnalyzer, {
            data: {response: "NSFW checked", id: task.data, type: "nsfwDetector"},
            time: new Date().toISOString(),
        });
        console.log(` ~ [!] Done processing image with id ${task.data}`);
    } catch (error: any) {
        console.log(` ~ [X] Error submitting the request to the queue: ${error.message}`);
        return;
    }
});

process.on('SIGINT', () => {
    console.log(' [*] Exiting...');
    closeConnection();
    process.exit(0);
});
