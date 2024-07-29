import {
    addInQueue,
    cancelConnection,
    input_dequeue,
    startInputConsumer,
    TaskType,
    input_pendingPromises,
    output_pendingPromises,
    input_queue,
    output_queue,
    ackEnqueue
} from "./queue/queue";
import express, { Application } from 'express';
import * as prometheus from 'prom-client';
import Redis from 'ioredis';
import {ConsumeMessage} from "amqplib";
import RabbitMQConnection from "./configuration/rabbitmq.config";

const app: Application = express();
const port: string | 8003 = process.env.PORT || 8003;

app.use(express.json());

const interval = 900/parseInt(process.env.MCL as string, 10);
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';

const inputQueueName = process.env.INPUT_QUEUE_NAME || 'imageanalyzer.queue';
const queueTypeMessageAnalyzer = process.env.QUEUE_IMAGE_RECOGNIZER || 'messageanalyzer.req';


const requests_message_analyzer = new prometheus.Counter({
    name: 'http_requests_total_message_analyzer_counter',
    help: 'Total number of HTTP requests',
});


const publisher = new Redis({
    host:  process.env.REDIS_HOST || 'redis',
    port: 6379,
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

startInputConsumer(inputQueueName, async (channel) => {
    while (true) {
        const msg: ConsumeMessage = await input_dequeue();
        await sleep(interval);
        await ackEnqueue(msg);
        const taskData: TaskType = JSON.parse(msg.content.toString());
        requests_message_analyzer.inc();
        addInQueue(exchangeName, queueTypeMessageAnalyzer, taskData);
    }
});

app.listen(port, () => {
    console.log(`Image-analyzer service launched ad http://localhost:${port}`);
});

process.on('SIGINT', async () => {
    console.log(' [*] Exiting...');
    cancelConnection();
    while(input_pendingPromises.length > 0 || output_pendingPromises.length > 0 || input_queue.length > 0 || output_queue.length > 0) await sleep(5000);
    await RabbitMQConnection.close();
    publisher.disconnect()
    await sleep(5000);
    process.exit(0);
});