import {addInQueue, closeConnection, startConsumer} from "./queue/queue";
import express, {Application} from "express";
import * as prometheus from 'prom-client';

const queueName = process.env.QUEUE_NAME || 'imagerec.queue';
const interval = 1000/parseInt(process.env.MCL as string, 10);
const queueTypeOutImageAnalyzer = process.env.QUEUE_OUT_IMAGE_ANALYZER || 'imageanalyzer.out.req';
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';

const app: Application = express();
const port: string | 8004 = process.env.PORT || 8004;

app.listen(port, () => {
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

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

startConsumer(queueName, (task) => {
    const dateStart = new Date();
    const id = task.data;
    sleep(interval).then(() => {
        const taskToSend = {
            data: {id: task.data, service: "imageRecognizer"},
            time: new Date().toISOString()
        };
        console.log("Sending to image analyzer: ", taskToSend);
        addInQueue(exchangeName, queueTypeOutImageAnalyzer, taskToSend);
    })
});

process.on('SIGINT', () => {
    console.log(' [*] Exiting...');
    closeConnection();
    process.exit(0);
});

