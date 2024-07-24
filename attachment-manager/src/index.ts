import {
    enqueue,
    dequeue,
    TaskType,
    queue,
    pendingPromises,
} from "./queue/queue";
import express, { Application } from 'express';
import * as prometheus from 'prom-client';
import {Channel, ConsumeMessage} from "amqplib";
import axios from "axios";

const queueName = process.env.QUEUE_NAME || 'attachmentman.queue';
const interval = 1000/parseInt(process.env.MCL as string, 10);
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';
const queueType = process.env.QUEUE_TYPE || 'imageanalyzer.req';

const app: Application = express();
const port: string | 8002 = process.env.PORT || 8002;

const requests = new prometheus.Counter({
    name: 'http_requests_total_image_analyzer_counter',
    help: 'Total number of HTTP requests',
});

app.listen(port, () => {
    console.log(`interval: ${interval}`);
    console.log(`MCL: ${parseInt(process.env.MCL as string, 10)}`);
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

app.post("/enqueue", async (req, res) => {
    const task: TaskType = req.body.task;
    const result = await enqueue(task);
    if (result) {
        res.status(200).send("Task added to the queue");
    } else {
        // TODO: increase lost messages counter
        res.status(500).send("Queue is full");
    }
});

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function loop() {
    console.log(' [*] Starting...');
    while(true) {
        const taskData: TaskType = await dequeue();
        await sleep(interval);
        requests.inc();
        // axios.post('http://image-analyzer-service:8003/enqueue', {task: taskData});
        //addInQueue(exchangeName, queueType, taskData);
    }
}


process.on('SIGINT', async () => {
    console.log(' [*] Exiting...');
    while(pendingPromises.length > 0 || queue.length > 0) await sleep(5000);
    await sleep(5000);
    process.exit(0);
});

loop();
