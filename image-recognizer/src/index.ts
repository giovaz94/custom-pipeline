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
import Redis from 'ioredis';
import RabbitMQConnection from "./configuration/rabbitmq.config";

const queueName = process.env.QUEUE_NAME || 'imagerec.queue';
const interval = 800/parseInt(process.env.MCL as string, 10);
const queueTypeOutImageAnalyzer = process.env.QUEUE_OUT_IMAGE_ANALYZER || 'imageanalyzer.out.req';
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';

const app: Application = express();
const port: string | 8004 = process.env.PORT || 8004;
const subscriber = new Redis({
    host:  process.env.REDIS_HOST || 'redis',
    port: 6379,
});

setInterval(() => {
    subscriber.ping((err, res) => {
        if (err) {
            console.error('Connection error:', err);
            return;
        }
    });
}, 1000);

app.listen(port, () => {
    console.log(`Image-recognizer service launched ad http://localhost:${port}`);
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
        const taskData: TaskType = JSON.parse(msg.content.toString());
        const id = taskData.data;
        const start = new Date();
        const remaining = await subscriber.decr(id);
        const stop = new Date();
        const elapsed = stop.getTime() - start.getTime();
        const delay = Math.max(0, interval - elapsed);
        await sleep(delay);
        channel.ack(msg);
        if (remaining == 0) {
            console.log("Sending to image analyzer: ", taskData);
            addInQueue(exchangeName, queueTypeOutImageAnalyzer, taskData);
        }
    }
});

process.on('SIGINT', async () => {
    console.log(' [*] Exiting...');
    cancelConnection();
    while(pendingPromises.length > 0 || queue.length > 0) await sleep(1000);
    await RabbitMQConnection.close();
    await sleep(5000);
process.exit(0);
});

