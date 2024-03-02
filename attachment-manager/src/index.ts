import {addInQueue, startConsumer, closeConnection} from "./queue/queue";
import express, {Request, Response , Application } from 'express';
import RequestCounter from "./req-counter/req.counter";

const queueName = process.env.QUEUE_NAME || 'attachmentman.queue';
const interval = 1000/parseInt(process.env.MCL as string, 10);
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';
const queueType = process.env.QUEUE_TYPE || 'imageanalyzer.req';

const app: Application = express();
const port: string | 8002 = process.env.PORT || 8002;

let lastRequestTime = new Date().getTime();

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
    sleep(interval).then(() => {
        const id = task.data;
        try {
            const taskToSend = {
                data: id,
                time: new Date().toISOString()
            }
            addInQueue(exchangeName, queueType, taskToSend);
        } catch (error: any) {
            console.log(` ~[X] Error submitting the request to the queue: ${error.message}`);
            return;
        }
    });

});

process.on('SIGINT', () => {
    console.log(' [*] Exiting...');
    closeConnection();
    process.exit(0);
});
