import {addInQueue, startConsumer, closeConnection} from "./queue/queue";
import express, {Request, Response , Application } from 'express';

const queueName = process.env.QUEUE_NAME || 'attachmentman.queue';
const interval = 1000/parseInt(process.env.MCL as string, 10);
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';
const queueType = process.env.QUEUE_TYPE || 'imageanalyzer.req';

const app: Application = express();
const port: string | 8002 = process.env.PORT || 8002;

let requestCounter = 0;
let lastRequestTime = new Date().getTime();

app.listen(port, () => {
    console.log(`Message parser service launched ad http://localhost:${port}`);
});

app.get('/inbound-workload', async (req: Request, res: Response) => {
    const now = new Date().getTime();
    const secondsElapsed = (now - lastRequestTime) / 1000;
    const inboundWorkload = requestCounter / secondsElapsed;

    lastRequestTime = new Date().getTime();
    requestCounter = 0;
    return res.status(200).send({
        inboundWorkload: inboundWorkload
    });
});



function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

startConsumer(queueName, async (task) => {
    console.log(` ~[*] New request received!`);
    requestCounter++;
    await sleep(interval);
    const id = task.data;
    try {
        const taskToSend = {
            data: id,
            time: new Date().toISOString()
        }
        await addInQueue(exchangeName, queueType, taskToSend);
        console.log(` ~[!] Request handled successfully!`);
    } catch (error: any) {
        console.log(` ~[X] Error submitting the request to the queue: ${error.message}`);
        return;
    }
});

process.on('SIGINT', () => {
    console.log(' [*] Exiting...');
    closeConnection();
    process.exit(0);
});
