import {
    dequeue,
    TaskType,
    queue,
    pendingPromises, enqueue,
} from "./queue/queue";
import express, {Application} from "express";
import * as prometheus from 'prom-client';
import Redis from 'ioredis';

const interval = 850/parseInt(process.env.MCL as string, 10);

const app: Application = express();
const port: string | 8006 = process.env.PORT || 8006;
app.use(express.json());
app.listen(port, () => {
    console.log(`Message parser service launched ad http://localhost:${port}`);
});

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
        console.log('Attachment:', taskData.data);
        let id = taskData.data;
        const decrResult = await publisher.decr(id);
        if (decrResult == 0) {
            completedMessages.inc();
            let res = await publisher.get(id + '_time');
            if (res) {
                const time = new Date(res);
                const now = new Date();
                const diff = now.getTime() - time.getTime();
                requestsTotalTime.inc(diff);
                console.log('Message:', id, 'completed in ', diff);
                publisher.del(id);
                publisher.del(id + "_time");
            }
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


