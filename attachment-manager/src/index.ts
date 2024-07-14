import {addInQueue, startConsumer, closeConnection, dequeue, TaskType} from "./queue/queue";
import express, { Application } from 'express';
import * as prometheus from 'prom-client';
import {Channel, ConsumeMessage} from "amqplib";

const queueName = process.env.QUEUE_NAME || 'attachmentman.queue';
const interval = 1000/parseInt(process.env.MCL as string, 10);
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';
const queueType = process.env.QUEUE_TYPE || 'imageanalyzer.req';

const app: Application = express();
const port: string | 8002 = process.env.PORT || 8002;

const requests = new prometheus.Counter({
    name: 'http_requests_total_counter',
    help: 'Total number of HTTP requests',
});

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

startConsumer(queueName, async (channel: Channel) => {
    while(true) {
        requests.inc();
        const msg: ConsumeMessage = await dequeue();
        await sleep(interval);
        channel.ack(msg);
        const taskData: TaskType = JSON.parse(msg.content.toString());
        addInQueue(exchangeName, queueType, {data: taskData.data, time: taskData.time});
    }

});

process.on('SIGINT', () => {
    console.log(' [*] Exiting...');
    closeConnection();
    process.exit(0);
});
