import {
    addInQueue,
    startConsumer,
    canelConnection,
    dequeue,
    TaskType,
    queue,
    pendingPromises,
    closeConnection, ackEnqueue
} from "./queue/queue";
import express, { Application } from 'express';
import * as prometheus from 'prom-client';
import {Channel, ConsumeMessage} from "amqplib";
import RabbitMQConnection from "./configuration/rabbitmq.config";

const queueName = process.env.QUEUE_NAME || 'attachmentman.queue';
const interval = 800/parseInt(process.env.MCL as string, 10);
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';
const queueType = process.env.QUEUE_TYPE || 'imageanalyzer.req';

const app: Application = express();
const port: string | 8002 = process.env.PORT || 8002;

const requests = new prometheus.Counter({
    name: 'http_requests_total_image_analyzer_counter',
    help: 'Total number of HTTP requests',
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
        const msg: ConsumeMessage = await dequeue();
        await sleep(interval);
        await ackEnqueue(msg);
        const taskData: TaskType = JSON.parse(msg.content.toString());
        requests.inc();
        console.log(taskData);
        addInQueue(exchangeName, "imageanalyzer.req", taskData);
    }
});

app.listen(port, () => {
    console.log(`Attachment-manager launched ad http://localhost:${port}`);
});

process.on('SIGINT', async () => {
    console.log(' [*] Exiting...');
    canelConnection();
    while(pendingPromises.length > 0 || queue.length > 0) await sleep(5000);
    await sleep(5000);
    await RabbitMQConnection.close();
    process.exit(0);
});
