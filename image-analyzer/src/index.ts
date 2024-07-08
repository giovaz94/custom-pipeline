import {addInQueue, closeConnection, startConsumer} from "./queue/queue";
import express, { Application } from 'express';
import * as prometheus from 'prom-client';
import Redis from 'ioredis';
import {uuid as v4} from "uuidv4";

const app: Application = express();
const port: string | 8003 = process.env.PORT || 8003;

app.use(express.json());

const inputQueueName = process.env.INPUT_QUEUE_NAME || 'imageanalyzer.queue';
const outputQueueName = process.env.OUTPUT_QUEUE_NAME || 'imageanalyzer.out.queue';

const interval = 1000/parseInt(process.env.MCL as string, 10);
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';

const queueTypeImageRecognizer = process.env.QUEUE_IMAGE_RECOGNIZER || 'imagerec.req';
const queueTypeNsfwDetector = process.env.QUEUE_IMAGE_RECOGNIZER || 'nsfwdet.req';
const queueTypeMessageAnalyzer = process.env.QUEUE_IMAGE_RECOGNIZER || 'messageanalyzer.req';

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

app.listen(port, () => {
    console.log(`Message parser service launched ad http://localhost:${port}`);
});
function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

startConsumer(outputQueueName, (task) => {
    const id = task.data.id;
    publisher.decr(id).then(res => {
        if(res == 0) {
            publisher.del(id).then(deleted => {
                if (deleted > 0) {
                    let original_id = id.split("_")[0];
                    console.log(original_id);
                    console.log(id);
                    const response = {
                        data : original_id,
                        time: new Date().toISOString()
                    }
                    addInQueue(exchangeName, queueTypeMessageAnalyzer, response);
                }
            });
        }
    });
});


startConsumer(inputQueueName, (task) => {
    let id = task.data;
    const dateStart = new Date();
    console.log("INPUT CALL");
    sleep(interval).then(() => {
        let id_fresh = id + '_image_analyzer' + v4();
        const taskToSend = {
            data: id_fresh,
            time: new Date().toISOString()
        }

        publisher.set(id_fresh, 2).then(res => {
            if (!res) {
                console.error('Error: failed to set ', id);
                return;
            }
            addInQueue(exchangeName, queueTypeImageRecognizer, taskToSend);
            addInQueue(exchangeName, queueTypeNsfwDetector, taskToSend);
        });
    })
});


process.on('SIGINT', () => {
    console.log(' [*] Exiting...');
    closeConnection();
    process.exit(0);
});
