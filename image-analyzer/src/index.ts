
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
let stop = false;
const limit = parseInt(process.env.LIMIT as string, 10) || 200;
const batch = parseInt(process.env.BATCH as string, 10) || mcl;
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


function publishOutMessage(streamName: string, message: Record<string, string>) {
    publisher.xlen(streamName).then(res => {
        if(res < limit) publisher.xadd(streamName, '*', ...Object.entries(message).flat());
        else  publisher.del(message['data']);
    });
}

function publishInMessage(streamName1: string, streamName2: string, idFresh: string, message: Record<string, string>) {
    Promise.all([publisher.xlen(streamName1),  publisher.xlen(streamName2)]).then(res => {
        if (res[0] < limit && res[1] < limit) {
            publisher.xadd(streamName1, '*', ...Object.entries(message).flat());
            publisher.xadd(streamName2, '*', ...Object.entries(message).flat());
        } else {
            publisher.del(message['data']);
            publisher.del(idFresh);
        }
    });
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

// async function listenToStreamOut() {
//     while (!stop) {
//       const messages = await publisher.xreadgroup(
//         'GROUP', 'image-analyzer-out-queue', consumerName,
//         'COUNT', batch, 'BLOCK', 0, 
//         'STREAMS', 'image-analyzer-out-stream', '>'
//       ) as RedisResponse;
//       if (messages.length > 0) {
//         const [_, entries]: [string, StreamEntry[]] = messages[0];
//         requests_message_analyzer.inc(entries.length);
//         for (const [messageId, fields] of entries) {
//             const id = fields[1];
//             const original_id = id.split("_")[0];
//             console.log(fields[1]);
//             publisher.get(fields[1], res => {
//                 requests_message_analyzer.inc();
//                 if (res && Number(res) == 0) publishOutMessage('message-analyzer-stream', {data: original_id, time: fields[3]});
//                 else console.log("error: out stream has a null value");
//             });
//             publisher.xack('image-analyzer-out-stream', 'image-analyzer-out-queue', messageId);
//             publisher.xdel('image-analyzer-out-stream', messageId);
//         };
//       }
//     }
//  }
  
 
 async function listenToStreamIn() {
    while (!stop) {
      const start = new Date();
      const messages = await publisher.xreadgroup(
        'GROUP', 'image-analyzer-queue', consumerName,
        'COUNT', batch, 'BLOCK', 0, 
        'STREAMS', 'image-analyzer-stream', '>'
      ) as RedisResponse;

      if (messages.length > 0) {
        const [_, entries]: [string, StreamEntry[]] = messages[0];
        requests_message_analyzer.inc(entries.length);
        // requests_image_recognizer.inc(entries.length);
        // requests_nsfw_detector.inc(entries.length);
        for (const [messageId, fields] of entries) {
            const start = new Date();
            //let id_fresh =  fields[1] + '_image_analyzer' + v4();
            //publisher.set(id_fresh, 2);
            console.log(fields[1]);
            // publishInMessage('image-recognizer-stream', 'nsfw-detector-stream', id_fresh, {data: id_fresh, time: fields[3]});
            // publishOutMessage('message-analyzer-stream', {data: fields[1], time: fields[3]});
            let res;
            const msg = {data: fields[1], time: fields[3]}
            res = await publisher.xlen('message-analyzer-stream');
            if(res < limit) await publisher.xadd('message-analyzer-stream', '*', ...Object.entries(msg).flat());
            else  publisher.del(msg['data']);

            const stop: Date =  new Date();
            publisher.xack('image-analyzer-stream', 'image-analyzer-queue', messageId);
            publisher.xdel('image-analyzer-stream', messageId);
            const elapsed = stop.getTime() - start.getTime();
            await sleep((800 - elapsed)/mcl);
        };
      }
    }
 }
 
 
 
 createConsumerGroup('image-analyzer-stream', 'image-analyzer-queue');
 //createConsumerGroup('image-analyzer-out-stream', 'image-analyzer-out-queue');
 listenToStreamIn();
 //listenToStreamOut();

app.listen(port, () => {
    console.log(`Image-analyzer service launched ad http://localhost:${port}`);
});


process.on('SIGINT', async () => {
    console.log(' [*] Exiting...');
    stop = true;
    await sleep(10000);
    publisher.disconnect();
    process.exit(0);
});