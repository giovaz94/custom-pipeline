import {dequeue, enqueue, queue, pendingPromises, TaskType} from "./queue/queue";
import express, {Application} from 'express';
import Redis from 'ioredis';
import {uuid as v4} from "uuidv4";
import * as prometheus from 'prom-client';
import axios from "axios";

const interval = 850/parseInt(process.env.MCL as string, 10);

const app: Application = express();
const port: string | 8011 = process.env.PORT || 8011;

app.use(express.json());
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
    const task: TaskType = req.body.task;
    const result = await enqueue(task);
    if (result) {
        res.status(200).send("Task added to the queue");
    } else {
        // TODO: increase lost messages counter
        lost_messages.inc();
        res.status(500).send("Queue is full");
    }
});

async function loop() {
    console.log(' [*] Starting...');
    while (true) {
        await dequeue();
        await sleep(interval);
        let id = v4();
        const n_attach = Math.floor(Math.random() * 5);
        console.log(id + " " + n_attach);
        const start: Date =  new Date();
        await publisher.set(id + "_time", start.toISOString());
        // @ts-ignore
        if(n_attach == 0) {
            request_message_analyzer.inc();
            const message = {data: id, time: start.toISOString() }
            publisher.set(id, 1).then(res => {
                if (!res) {
                    console.error('Error: failed to insert', id);
                    return;
                }
                axios.post('http://message-analyzer-service:8006/enqueue', {task: message});
            });
        } else {
            vs_requests.inc(n_attach);
            publisher.set(id, n_attach).then(res => {
                if (!res) {
                    console.error('Error: failed to insert', id);
                    return;
                }
                for (let i = 0; i < n_attach; i++) {
                    const message = {data: id, time: start.toISOString()}
                    // TODO: pass message to the next service (virusscanner)
                    axios.post('http://virus-scanner-service:8001/enqueue', {task: message});
                }
            });
        }

    }
}

process.on('SIGINT', async () => {
    console.log(' [*] Exiting...');
    while(pendingPromises.length > 0 || queue.length > 0) await sleep(5000);
    await sleep(5000);
    process.exit(0);
});

loop();