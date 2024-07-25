import {
    dequeue,
    TaskType,
    queue,
    pendingPromises, enqueue,
} from "./queue/queue";
import express, { Application } from 'express';
import * as prometheus from 'prom-client';
import {ConsumeMessage} from "amqplib";
import axios from "axios";

const queueName = process.env.QUEUE_NAME || 'nsfwdet.queue';
const interval = 1000/parseInt(process.env.MCL as string, 10);
const queueTypeOutImageAnalyzer = process.env.QUEUE_OUT_IMAGE_ANALYZER || 'imageanalyzer.out.req';
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';


const app: Application = express();
app.use(express.json());
const port: string | 8005 = process.env.PORT || 8005;

app.listen(port, () => {
    console.log(`Nsfw detector service launched ad http://localhost:${port}`);
});

const requests_nsfw_detector = new prometheus.Counter({
    name: 'http_requests_total_nsfw_detector_counter',
    help: 'Total number of HTTP requests',
});

const lost_messages = new prometheus.Counter({
    name: 'lost_messages',
    help: 'Total number of lost messages',
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
    requests_nsfw_detector.inc();
    const task: TaskType = req.body.task;
    const result = await enqueue(task);
    if (result) {
        res.status(200).send("Task added to the queue");
    } else {
        lost_messages.inc();
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
        console.log("Sending to image analyzer: ", taskData);
        axios.post('http://image-analyzer-service:8003/signal', {task: taskData});
    }
}

process.on('SIGINT', async () => {
    console.log(' [*] Exiting...');
    while(pendingPromises.length > 0 || queue.length > 0) await sleep(5000);
    await sleep(5000);
    process.exit(0);
});

loop();