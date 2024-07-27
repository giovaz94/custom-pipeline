import {
    addInQueue,
    cancelConnection,
    closeConnection,
    dequeue,
    startConsumer,
    TaskType,
    queue,
    pendingPromises,
    ackEnqueue
} from "./queue/queue";
import express, {Application} from 'express';
import Redis from 'ioredis';
import {uuid as v4} from "uuidv4";
import * as prometheus from 'prom-client';
import {ConsumeMessage, Channel} from "amqplib";
import RabbitMQConnection from "./configuration/rabbitmq.config";


const queueName = process.env.QUEUE_NAME || 'parser.queue';
const queueType = process.env.QUEUE_TYPE || 'virusscan.req';

const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';

const interval = 900/parseint(process.env.MCL as string, 10);


const app: Application = express();
const port: string | 8011 = process.env.PORT || 8011;


function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const publisher = new Redis({
    host:  process.env.REDIS_HOST || 'redis',
    port: 6379,
});

const vs_requests = new prometheus.Counter({
    name: 'http_requests_total_virus_scanner_counter',
    help: 'Total number of HTTP requests',
});

const request_message_analyzer = new prometheus.Counter({
    name: 'http_requests_total_message_analyzer_counter',
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

startConsumer(queueName, async (channel: Channel) => {
    while(true) {
        const msg: ConsumeMessage = await dequeue();
        let id = v4();
        const n_attach = 1//Math.floor(Math.random() * 5);
        await sleep(interval);
        await ackEnqueue(msg);
        const start: Date =  new Date();
        // @ts-ignore
        if(n_attach == 0) {
            request_message_analyzer.inc();
            const message = {data: id, time: start.toISOString() }
            publisher.set(id, 1).then(res => {
                if (!res) {
                    return;
                }
                const queueName = "messageanalyzer.req"
                addInQueue(exchangeName, queueName, message);
            });
        } else {
            vs_requests.inc(n_attach);
            publisher.set(id, n_attach);
            for (let i = 0; i < n_attach; i++) {
                const message = {data: id, time: start.toISOString()}
                addInQueue(exchangeName, queueType, message);
            }
        }
        publisher.set(id + "_time", start.toISOString());
    }
});

app.listen(port, () => {
    console.log(`Message parser service launched ad http://localhost:${port}`);
});

process.on('SIGINT', async () => {
    console.log(' [*] Exiting...');
    cancelConnection();
    while(pendingPromises.length > 0 || queue.length > 0) await sleep(5000);
    await sleep(5000);
    await RabbitMQConnection.close();
    publisher.disconnect();
    process.exit(0);
});
