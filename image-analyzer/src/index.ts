
import express, { Application } from 'express';
import * as prometheus from 'prom-client';
import Redis from 'ioredis';
import {uuid as v4} from "uuidv4";
import axios from "axios";

type StreamEntry = [string, string[]];
type RedisResponse = [string, StreamEntry[]][];
const consumerName = v4();
const app: Application = express();
const port: string | 8003 = process.env.PORT || 8003;
const mcl = parseInt(process.env.MCL as string, 10);
//const interval = 900/parseInt(process.env.MCL as string, 10);
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
const publisher = new Redis({
    host:  process.env.REDIS_HOST || 'redis',
    port: 6379,
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
// startInputConsumer(inputQueueName, async (channel) => {
//     while (true) {
//         const msg: ConsumeMessage = await input_dequeue();
//         await ackEnqueue(msg);
//         const taskData: TaskType = JSON.parse(msg.content.toString());
//         addInQueue(exchangeName, queueTypeMessageAnalyzer, taskData);
//         await sleep(interval);
//         // let id = taskData.data;
//         // let id_fresh =  id + '_image_analyzer' + v4();
//         // const taskToSend = {
//         //     data: id_fresh,
//         //     time: taskData.time
//         // }
//         // const res = await publisher.set(id_fresh, 2);
//         // if (!res) {
//         //     console.error('Error: failed to set ', id);
//         //     return;
//         // }
//         //requests_image_recognizer.inc();
//         // addInQueue(exchangeName, queueTypeImageRecognizer, taskToSend);
//         // addInQueue(exchangeName, queueTypeNsfwDetector, taskToSend);
//         //requests_nsfw_detector.inc();
//         //Promise.all([axios.get('http://image-recognizer-service:8004/analyze'), axios.get('http://nsfw-detector-service:8005/analyze')]).then(res => addInQueue(exchangeName, queueTypeMessageAnalyzer, taskData));
//     }
// });


async function publishMessage(streamName: string, message: Record<string, string>): Promise<void> {
    publisher.xadd(streamName, '*', ...Object.entries(message).flat());
 }
 
async function createConsumerGroup(streamName: string, groupName: string): Promise<void> {
    try {
        await publisher.xgroup('CREATE', streamName, groupName, '$', 'MKSTREAM');
        console.log(`Consumer group ${groupName} created for stream ${streamName}`);
    } catch (err: any) {
        if (err.message.includes('BUSYGROUP Consumer Group name already exists')) {
            console.log(`Consumer group ${groupName} already exists`);
        } else {
            console.error('Error creating consumer group:', err);
        }
    }
}
  
 
 async function listenToStream() {
    while (true) {
      const messages = await publisher.xreadgroup(
        'GROUP', 'image-analyzer-queue', consumerName,
        'COUNT', 1, 'BLOCK', 0, 
        'STREAMS', 'image-analyzer-stream', '>'
      ) as RedisResponse;
      if (messages.length > 0) {
        const [_, entries]: [string, StreamEntry[]] = messages[0];
        requests_message_analyzer.inc(entries.length);
        for (const [messageId, fields] of entries) {
            let id = fields[1];
            console.log(fields[1]);
            publishMessage('message-analyzer-stream', {data: fields[1], time: fields[3]}).catch(console.error);
            publisher.xack('image-analyzer-stream', 'image-analyzer-queue', messageId);
            await sleep(1000/mcl);
        };
      }
    }
 }
 
 
 
 createConsumerGroup('image-analyzer-stream', 'image-analyzer-queue');
 
 listenToStream();

app.listen(port, () => {
    console.log(`Image-analyzer service launched ad http://localhost:${port}`);
});


process.on('SIGINT', async () => {
    console.log(' [*] Exiting...');
    publisher.disconnect()
    await sleep(5000);
    process.exit(0);
});