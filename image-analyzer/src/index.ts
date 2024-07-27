import {
    addInQueue,
    cancelConnection,
    input_dequeue,
    output_dequeue,
    startInputConsumer,
    startOutputConsumer,
    TaskType,
    input_pendingPromises,
    output_pendingPromises,
    input_queue,
    output_queue,
    closeConnection, ackEnqueue
} from "./queue/queue";
import express, { Application } from 'express';
import * as prometheus from 'prom-client';
import Redis from 'ioredis';
import {uuid as v4} from "uuidv4";
import {ConsumeMessage} from "amqplib";
import RabbitMQConnection from "./configuration/rabbitmq.config";
import axios from "axios";

const app: Application = express();
const port: string | 8003 = process.env.PORT || 8003;

app.use(express.json());

const inputQueueName = process.env.INPUT_QUEUE_NAME || 'imageanalyzer.queue';
const outputQueueName = process.env.OUTPUT_QUEUE_NAME || 'imageanalyzer.out.queue';

const interval = 900/parseInt(process.env.MCL as string, 10);
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';

const queueTypeImageRecognizer = process.env.QUEUE_IMAGE_RECOGNIZER || 'imagerec.req';
const queueTypeNsfwDetector = process.env.QUEUE_IMAGE_RECOGNIZER || 'nsfwdet.req';
const queueTypeMessageAnalyzer = process.env.QUEUE_IMAGE_RECOGNIZER || 'messageanalyzer.req';



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

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// startOutputConsumer(outputQueueName, async (channel) => {
//     while(true) {
//         const msg: ConsumeMessage = await output_dequeue();
//         const taskData: TaskType = JSON.parse(msg.content.toString());
//         const id = taskData.data;
//         channel.ack(msg);
//         let original_id = id.split("_")[0];
//         requests_message_analyzer.inc();
//         const response = {data : original_id, time: taskData.time};
//         addInQueue(exchangeName, queueTypeMessageAnalyzer, response);
//         publisher.del(id);
//     }
// });

startInputConsumer(inputQueueName, async (channel) => {
    while (true) {
        const msg: ConsumeMessage = await input_dequeue();
        await ackEnqueue(msg);
        const taskData: TaskType = JSON.parse(msg.content.toString());
        addInQueue(exchangeName, queueTypeMessageAnalyzer, taskData);
        await sleep(interval);
        // let id = taskData.data;
        // let id_fresh =  id + '_image_analyzer' + v4();
        // const taskToSend = {
        //     data: id_fresh,
        //     time: taskData.time
        // }
        // const res = await publisher.set(id_fresh, 2);
        // if (!res) {
        //     console.error('Error: failed to set ', id);
        //     return;
        // }
        //requests_image_recognizer.inc();
        // addInQueue(exchangeName, queueTypeImageRecognizer, taskToSend);
        // addInQueue(exchangeName, queueTypeNsfwDetector, taskToSend);
        //requests_nsfw_detector.inc();
        //Promise.all([axios.get('http://image-recognizer-service:8004/analyze'), axios.get('http://nsfw-detector-service:8005/analyze')]).then(res => addInQueue(exchangeName, queueTypeMessageAnalyzer, taskData));
    }
});

app.listen(port, () => {
    console.log(`Image-analyzer service launched ad http://localhost:${port}`);
});


process.on('SIGINT', async () => {
    console.log(' [*] Exiting...');
    cancelConnection();
    while(input_pendingPromises.length > 0 || output_pendingPromises.length > 0 || input_queue.length > 0 || output_queue.length > 0) await sleep(5000);
    await RabbitMQConnection.close();
    subscriber.disconnect()
    publisher.disconnect()
    await sleep(5000);
    process.exit(0);
});