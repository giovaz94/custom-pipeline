import {addInQueue, closeConnection, dequeue, startConsumer, TaskType, queue, pendingPromises} from "./queue/queue";
import express, {Application} from 'express';
import Redis from 'ioredis';
import {uuid as v4} from "uuidv4";
import * as prometheus from 'prom-client';
import {ConsumeMessage, Channel} from "amqplib";


const dbUrl = process.env.DB_URL || 'http://localhost:3200';
const queueName = process.env.QUEUE_NAME || 'parser.queue';
const queueType = process.env.QUEUE_TYPE || 'virusscan.req';
const deltaTime = 1000
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';

const interval = 1000/parseInt(process.env.MCL as string, 10);

const app: Application = express();
const port: string | 8011 = process.env.PORT || 8011;


function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const publisher = new Redis({
    host:  process.env.REDIS_HOST || 'redis',
    port: 6379,
});

app.listen(port, () => {
    console.log(`Message parser service launched ad http://localhost:${port}`);
});

const vs_requests = new prometheus.Counter({
    name: 'http_requests_total_virus_scanner_counter',
    help: 'Total number of HTTP requests',
});

const request_message_analyzer = new prometheus.Counter({
    name: 'http_requests_total_message_analyzer_counter',
    help: 'Total number of HTTP requests',
 });

const rejected_messages = new prometheus.Counter({
    name: 'ttl_rejected_messages_message_analyzer_counter',
    help: 'Total number of HTTP requests rejected by ttl',
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

/**
 * Check if the TTL is valid
 * @param ttl
 */
function ttlIsValid(ttl: Date): boolean {
    const now = new Date();
    const diff = ttl.getTime() - now.getTime();
    return diff > 0;
}

/**
 * Increase a date of tot milliseconds
 * @param delta
 */
function increaseNow(delta: number): Date {
    return new Date(new Date().getTime() + delta)
}

startConsumer(queueName, async (channel: Channel) => {
    while(true) {

        const msg: ConsumeMessage = await dequeue();
        const taskData: TaskType = JSON.parse(msg.content.toString());

        const ttl = new Date(taskData.ttl);

        if (ttlIsValid(ttl)) {
            await sleep(interval);
            let id = v4();
            const n_attach = Math.floor(Math.random() * 5);
            // channel.ack(msg);
            const start: Date = new Date();
            const message = {
                data: id, time: start.toISOString(), ttl: increaseNow(deltaTime).toString()
            }

            if (n_attach == 0) {
                request_message_analyzer.inc();
                const res = await publisher.set(id, 1);
                console.log("Result: " + res);
                if (!res) {
                    console.error('Error: failed to insert', id);
                    return;
                }
                console.log("Adding without attachments to the queue");
                const queueName = "messageanalyzer.req"
                addInQueue(exchangeName, queueName, message);
            } else {
                vs_requests.inc(n_attach);
                const res = await publisher.set(id, n_attach);
                console.log("Result: " + res);
                if (!res) {
                    console.error('Error: failed to insert', id);
                    return;
                }
                console.log("Adding " + n_attach + " attachments to the queue");
                for (let i = 0; i < n_attach; i++) {
                    addInQueue(exchangeName, queueType, message);
                }
            }
            publisher.set(id + "_time", start.toISOString())
        } else {
            rejected_messages.inc();
        }
    }
});

process.on('SIGINT', async () => {
    console.log(' [*] Exiting...');
    closeConnection();
    while(pendingPromises.length > 0 || queue.length > 0) await sleep(1000);
    process.exit(0);
});
