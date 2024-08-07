import {addInQueue, closeConnection, dequeue, startConsumer, TaskType} from "./queue/queue";
import express, {Application} from 'express';
import Redis from 'ioredis';
import {uuid as v4} from "uuidv4";
import * as prometheus from 'prom-client';
import {ConsumeMessage, Channel} from "amqplib";


const dbUrl = process.env.DB_URL || 'http://localhost:3200';
const queueName = process.env.QUEUE_NAME || 'parser.queue';
const queueType = process.env.QUEUE_TYPE || 'virusscan.req';

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
        await sleep(interval);
        let id = v4();
        const n_attach = Math.floor(Math.random() * 5);
        channel.ack(msg);
        const taskData: TaskType = JSON.parse(msg.content.toString());
        if(n_attach == 0) {
            request_message_analyzer.inc();
            const message = {data: id, time: taskData.time }
            publisher.set(id, 1).then(res => {
                console.log("Result: " + res);
                if (!res) {
                    console.error('Error: failed to insert', id);
                    return;
                }
                console.log("Adding without attachments to the queue");
                const queueName = "messageanalyzer.req"
                addInQueue(exchangeName, queueName, message);
            });
        } else {
            vs_requests.inc(n_attach);
            publisher.set(id, n_attach).then(res => {
                console.log("Result: " + res);
                if (!res) {
                    console.error('Error: failed to insert', id);
                    return;
                }
                console.log("Adding " + n_attach + " attachments to the queue");
                for (let i = 0; i < n_attach; i++) {
                    const message = {data: id, time: taskData.time}
                    addInQueue(exchangeName, queueType, message);
                }
            });
        }
        publisher.set(id + "_time", taskData.time.toString())
    }
});

process.on('SIGINT', () => {
    console.log(' [*] Exiting...');
    closeConnection();
    process.exit(0);
});
