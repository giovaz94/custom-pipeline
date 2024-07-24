import {
    enqueue,
    dequeue,
    TaskType,
    queue,
    pendingPromises
} from "./queue/queue";
import express, {Application} from "express";
import * as prometheus from 'prom-client';
import axios from "axios";

const interval = 1000/parseInt(process.env.MCL as string, 10);
const app: Application = express();
const port: string | 8004 = process.env.PORT || 8004;
app.use(express.json());

app.listen(port, () => {
    console.log(`Message parser service launched ad http://localhost:${port}`);
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
        console.log("Sending to image analyzer: ", taskData);
        axios.post('http://image-analyzer-service:8003/signal', {task: taskData});
    }
}

process.on('SIGINT', async () => {
    console.log(' [*] Exiting...');
    while(pendingPromises.length > 0 || queue.length > 0) await sleep(1000);
    await sleep(5000);
    process.exit(0);
});

loop();

