import {addInQueue, closeConnection, dequeue, startConsumer, TaskType} from "./queue/queue";
import express, { Application } from 'express';
import * as prometheus from 'prom-client';
import Redis from 'ioredis';
import {ConsumeMessage} from "amqplib";

const queueName = process.env.QUEUE_NAME || 'nsfwdet.queue';
const interval = 1000/parseInt(process.env.MCL as string, 10);
const queueTypeOutImageAnalyzer = process.env.QUEUE_OUT_IMAGE_ANALYZER || 'imageanalyzer.out.req';
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';


const app: Application = express();
const port: string | 8005 = process.env.PORT || 8005;

app.listen(port, () => {
    console.log(`Nsfw detector service launched ad http://localhost:${port}`);
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

startConsumer(queueName, async (channel) => {
    while(true) {
        const msg: ConsumeMessage = await dequeue();
        await sleep(interval);
        // channel.ack(msg);
        const taskData: TaskType = JSON.parse(msg.content.toString());
        const taskToSend = {
            data: {id: taskData.data, service: "nsfwDetector"},
            time: taskData.time
        };
        console.log("Sending to image analyzer: ", taskToSend);
        addInQueue(exchangeName, queueTypeOutImageAnalyzer, taskToSend);
    }
});

process.on('SIGINT', () => {
    console.log(' [*] Exiting...');
    closeConnection();
    process.exit(0);
});
