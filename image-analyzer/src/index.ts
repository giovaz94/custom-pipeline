import { queue, dequeue, inputPendingPromises, TaskType, enqueue} from "./queue/queue";
import express, { Application } from 'express';
import * as prometheus from 'prom-client';
import Redis from 'ioredis';
import {uuid as v4} from "uuidv4";
import axios from "axios";

const app: Application = express();
const port: string | 8003 = process.env.PORT || 8003;

app.use(express.json());

const interval = 1000/parseInt(process.env.MCL as string, 10);

const requests_message_analyzer = new prometheus.Counter({
    name: 'http_requests_total_message_analyzer_counter',
    help: 'Total number of HTTP requests',
});

const requests_image_recognizer = new prometheus.Counter({
    name: 'http_requests_total_image_recognizer_counter',
    help: 'Total number of HTTP requests',
});

const requests_nsfw_detector = new prometheus.Counter({
    name: 'http_requests_total_nsfw_detector_counter',
    help: 'Total number of HTTP requests',
});


const subscriber = new Redis({
    host:  process.env.REDIS_HOST || 'redis',
    port: 6379,
});

const publisher = new Redis({
    host:  process.env.REDIS_HOST || 'redis',
    port: 6379,
});


subscriber.on('error', (err) => {
    console.log('Error with Redis:', err);
});

setInterval(() => {
    subscriber.ping((err, res) => {
        if (err) {
            console.error('Connection error:', err);
            return;
        }
    });
}, 1000);


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

app.post("/signal", async (req, res) => {
    const taskData: TaskType = req.body.task;
    const id = taskData.data;
    publisher.decr(id, (err, result) => {
        if(err) {
            console.error('Error: ', err);
            return;
        }
        if(result == 0) {
            publisher.del(id);
            let originalId = id.split("_")[0];
            console.log(originalId);
            console.log(id);
            const response: TaskType = {data : originalId, time: taskData.time};
            requests_message_analyzer.inc();
            axios.post('http:/message-analyzer-service:8006/enqueue', {task: response});
        }
    });
});

app.listen(port, () => {
    console.log(`Message parser service launched ad http://localhost:${port}`);
});

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function loop() {
    console.log(' [*] Starting...');
    while(true) {
        const taskData: TaskType = await dequeue();
        await sleep(interval);
        let id = taskData.data;
        let id_fresh =  id + '_image_analyzer' + v4();
        const taskToSend = {
            data: id_fresh,
            time: taskData.time
        }
        const res = await publisher.set(id_fresh, 2);
        if (!res) {
            console.error('Error: failed to set ', id);
            return;
        }
        requests_image_recognizer.inc();
        axios.post('http://image-recognizer-service:8004/enqueue', {task: taskToSend});
        requests_nsfw_detector.inc();
        axios.post('http://nsfw-detector-service:8005/enqueue', {task: taskToSend});
    }
}

process.on('SIGINT', async () => {
    console.log(' [*] Exiting...');
    while(queue.length > 0 || inputPendingPromises.length > 0) await sleep(5000);
    await sleep(5000);
    process.exit(0);
});

loop();