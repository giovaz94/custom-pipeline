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

const requests_message_analyzer = new prometheus.Counter({
    name: 'http_requests_total_message_analyzer',
    help: 'Total number of HTTP requests',
});

const requests_image_recognizer = new prometheus.Counter({
    name: 'http_requests_total_image_recognizer',
    help: 'Total number of HTTP requests',
});

const requests_nsfw_detector = new prometheus.Counter({
    name: 'http_requests_total_nsfw_detector',
    help: 'Total number of HTTP requests',
});

const requestsTotalTime = new prometheus.Counter({
    name: 'http_response_time_sum',
    help: 'Response time sum'
});

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

app.listen(port, () => {
    console.log(`Message parser service launched ad http://localhost:${port}`);
});
function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

startConsumer(outputQueueName, (task) => {
    const id = task.data.id;
    const service = task.data.service;

    if (service === 'imageRecognizer') publisher.hset(id, {imageRecognizer: true});
    else if (service === 'nsfwDetector') publisher.hset(id, {nsfwDetector: true});
    
    publisher.hgetall(id).then(res => {
        if (!res) {
            console.error('Failed to get: ', id);
            return;
        }  

        if (res.imageRecognizer && res.nsfwDetector) {
            publisher.del(id).then(deleted => {
                if (deleted > 0) {
                    let original_id = res.original_id;
                    console.log(original_id);
                    console.log(id);
                    const response = {
                        data : original_id,
                        time: new Date().toISOString()
                    }
                    addInQueue(exchangeName, queueTypeMessageAnalyzer, response, messageLost, requests_message_analyzer);
                }
            });
        }
    });
});


startConsumer(inputQueueName, (task) => {
    let id = task.data;
    let id_fresh = v4();
    id_fresh += '_image_analyzer';
    const dateStart = new Date();
    console.log("INPUT CALL");
    sleep(interval).then(() => {
        const taskToSend = {
            data: id_fresh,
            time: new Date().toISOString()
        }
        publisher.hset(id_fresh, {imageRecognizer: false, nsfwDetector: false, original_id: id}).then(res => {
            if (!res) {
                console.error('Error: failed to set ', id);
                return;
            }
            addInQueue(exchangeName, queueTypeImageRecognizer, taskToSend, messageLost, requests_image_recognizer);
            addInQueue(exchangeName, queueTypeNsfwDetector, taskToSend, messageLost, requests_nsfw_detector);
        });

    }).finally(() => {
        const dateEnd = new Date();
        const secondsDifference = dateEnd.getTime() - dateStart.getTime();
        requestsTotalTime.inc(secondsDifference);
    })
});




process.on('SIGINT', () => {
    console.log(' [*] Exiting...');
    closeConnection();
    process.exit(0);
});
