import {addInQueue, startConsumer, closeConnection} from "./queue/queue";
import express, {Request, Response , Application } from 'express';
import RequestCounter from "./req-counter/req.counter";

const queueName = process.env.QUEUE_NAME || 'attachmentman.queue';
const interval = 1000/parseInt(process.env.MCL as string, 10);
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';
const queueType = process.env.QUEUE_TYPE || 'imageanalyzer.req';

const app: Application = express();
const port: string | 8002 = process.env.PORT || 8002;

app.listen(port, () => {
    console.log(`Message parser service launched ad http://localhost:${port}`);
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
