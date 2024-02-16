import {addInQueue, closeConnection, startConsumer} from "./queue/queue";
import express, {Application, Request, Response} from "express";
import RequestCounter from "./req-counter/req.counter";

const queueName = process.env.QUEUE_NAME || 'imagerec.queue';
const interval = 1000/parseInt(process.env.MCL as string, 10);
const dbUrl = process.env.DB_URL || 'http://localhost:3200';
const queueTypeImageAnalyzer = process.env.QUEUE_IMAGE_ANALYZER || 'imageanalyzer.req';
let requestCounter = 0;
let lastRequestTime = new Date().getTime();

const app: Application = express();
const port: string | 8004 = process.env.PORT || 8004;

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
    const id = task.data;
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

process.on('SIGINT', () => {
    console.log(' [*] Exiting...');
    closeConnection();
    process.exit(0);
});

