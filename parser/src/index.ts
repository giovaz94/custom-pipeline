import {addInQueue, closeConnection, startConsumer, TaskType} from "./queue/queue";
import express, {Application} from 'express';
import Redis from 'ioredis';
import {uuid as v4} from "uuidv4";
import * as prometheus from 'prom-client';

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

const requests = new prometheus.Counter({
    name: 'http_requests_total_virus_scanner',
    help: 'Total number of HTTP requests',
});

const requestsTotalTime = new prometheus.Counter({
    name: 'http_response_time_sum',
    help: 'Response time sum'
})

const messageLost = new prometheus.Counter({
    name: 'services_message_lost',
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

startConsumer(queueName, (task: TaskType) => {
    //TODO: WHAT HAPPENS IF n_attach = 0?
    sleep(interval).then(() => {
        let id = v4();
        const n_attach = Math.floor(Math.random() * 5);
        publisher.set(id, n_attach).then(res => {
            console.log("Result: " + res);

            if (!res) {
                console.error('Error: failed to insert', id);
                messageLost.inc();
                return;
            }
            console.log("Adding " + n_attach + " attachments to the queue");
            for (let i = 0; i < n_attach; i++) {
                const message = {
                    data: id,
                    time: new Date().toISOString()
                }
                requests.inc();
                addInQueue(exchangeName, queueType, message, messageLost);
            }
        });
    })
    // .finally(() => {
    //     const dateEnd = new Date();
    //     const secondsDifference = dateEnd.getTime() - dateStart.getTime();
    //     requestsTotalTime.inc(secondsDifference);
    // })
});

process.on('SIGINT', () => {
    console.log(' [*] Exiting...');
    closeConnection();
    process.exit(0);
});
