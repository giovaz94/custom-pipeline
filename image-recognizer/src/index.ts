import {
    addInQueue,
    cancelConnection,
    dequeue,
    startConsumer,
    TaskType,
    queue,
    pendingPromises,
    closeConnection
} from "./queue/queue";
import express, {Application} from "express";
import * as prometheus from 'prom-client';
import {ConsumeMessage} from "amqplib";

const queueName = process.env.QUEUE_NAME || 'imagerec.queue';
const interval = 850/parseInt(process.env.MCL as string, 10);
const queueTypeOutImageAnalyzer = process.env.QUEUE_OUT_IMAGE_ANALYZER || 'imageanalyzer.out.req';
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';

const app: Application = express();
const port: string | 8004 = process.env.PORT || 8004;

app.listen(port, () => {
    console.log(`Message parser service launched ad http://localhost:${port}`);
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

startConsumer(queueName, async (channel) => {
    while(true) {
        const msg: ConsumeMessage = await dequeue();
        await sleep(interval);
        channel.ack(msg);
        const taskData: TaskType = JSON.parse(msg.content.toString());
        console.log("Sending to image analyzer: ", taskData);
        addInQueue(exchangeName, queueTypeOutImageAnalyzer, taskData);
    }
});

process.on('SIGINT', async () => {
    console.log(' [*] Exiting...');
    cancelConnection();
    while(pendingPromises.length > 0 || queue.length > 0) await sleep(1000);
    await closeConnection();
    await sleep(5000);
process.exit(0);
});

