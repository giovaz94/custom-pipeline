import {closeConnection, dequeue, startConsumer, TaskType, queue, pendingPromises} from "./queue/queue";
import express, {Application} from "express";
import * as prometheus from 'prom-client';

import Redis from 'ioredis';
import {ConsumeMessage} from "amqplib";

const queueName = process.env.QUEUE_NAME || 'aggregator.queue';

const app: Application = express();
const port: string | 8006 = process.env.PORT || 8006;

app.listen(port, () => {
    console.log(`Message parser service launched ad http://localhost:${port}`);
});

const publisher = new Redis({
    host:  process.env.REDIS_HOST || 'redis',
    port: 6379,
});

const requestsTotalTime = new prometheus.Counter({
    name: 'http_response_time_sum',
    help: 'Response time sum'
})

const completedMessages = new prometheus.Counter({
    name: 'message_analyzer_complete_message',
    help: 'Number of messages lost'
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

startConsumer(queueName,async (channel) => {
    while (true) {
        const msg: ConsumeMessage = await dequeue();
        const taskData: TaskType = JSON.parse(msg.content.toString());
        channel.ack(msg);
        const diff = taskData.data;
        console.log('Time needed:', diff);
        completedMessages.inc();
        requestsTotalTime.inc(diff);
    }
});

process.on('SIGINT', async () => {
    console.log(' [*] Exiting...');
    closeConnection();
    while(pendingPromises.length > 0 || queue.length > 0) await sleep(1000);
    process.exit(0);
});



