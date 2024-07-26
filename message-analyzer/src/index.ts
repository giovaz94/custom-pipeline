import {
    cancelConnection,
    dequeue,
    startConsumer,
    TaskType,
    queue,
    pendingPromises,
    closeConnection, ackEnqueue
} from "./queue/queue";
import express, {Application} from "express";
import * as prometheus from 'prom-client';
import Redis from 'ioredis';
import {ConsumeMessage} from "amqplib";
import RabbitMQConnection from "./configuration/rabbitmq.config";

const queueName = process.env.QUEUE_NAME || 'messageanalyzer.queue';
const interval = 800/parseInt(process.env.MCL as string, 10);

const app: Application = express();
const port: string | 8006 = process.env.PORT || 8006;

const publisher = new Redis({
    host:  process.env.REDIS_HOST || 'redis',
    port: 6379,
});

const requestsTotalTime = new prometheus.Counter({
    name: 'http_requests_total_time',
    help: 'Response time sum'
});

const completedMessages = new prometheus.Counter({
    name: 'http_requests_total_global',
    help: 'Total number of completed messages',
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
        await sleep(interval);
        await ackEnqueue(msg);
        console.log('Attachment:', taskData.data)
        let id = taskData.data;
        publisher.decr(id).then(res => {
            if (res == 0) {
                const now = new Date();
                completedMessages.inc();
                publisher.get(id + '_time').then(res2 => {
                    if (res2) {
                        const time = new Date(res2);
                        const diff = now.getTime() - time.getTime();
                        requestsTotalTime.inc(diff);
                        console.log('Message:', id, 'completed in ', diff);
                        publisher.del(id);
                        publisher.del(id + "_time");
                    }
                });
            }
        });
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




