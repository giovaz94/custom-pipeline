// import {
//     addInQueue,
//     cancelConnection,
//     dequeue,
//     startConsumer,
//     TaskType,
//     queue,
//     pendingPromises, ackEnqueue
// } from "./queue/queue";
// import express, {Application, Request, Response } from "express";
// import * as prometheus from 'prom-client';
// import {ConsumeMessage} from "amqplib";
// import Redis from 'ioredis';
// import RabbitMQConnection from "./configuration/rabbitmq.config";

// const queueName = process.env.QUEUE_NAME || 'imagerec.queue';
// const mcl = parseInt(process.env.MCL as string, 10);
//const interval = 900/parseInt(process.env.MCL as string, 10);
// const queueTypeOutImageAnalyzer = process.env.QUEUE_OUT_IMAGE_ANALYZER || 'imageanalyzer.out.req';
// const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';
// const requestQueue: Request[] = [];

// const app: Application = express();
// const port: string | 8004 = process.env.PORT || 8004;
// const subscriber = new Redis({
//     host:  process.env.REDIS_HOST || 'redis',
//     port: 6379,
// });

// setInterval(() => {
//     subscriber.ping((err, res) => {
//         if (err) {
//             console.error('Connection error:', err);
//             return;
//         }
//     });
// }, 1000);

// app.listen(port, () => {
//     console.log(`Image-recognizer service launched ad http://localhost:${port}`);
// });

// app.get('/metrics', (req, res) => {
//     prometheus.register.metrics()
//         .then(metrics => {
//             res.set('Content-Type', prometheus.contentType);
//             res.end(metrics);
//         })
//         .catch(error => {
//             console.error("Error:", error);
//             res.status(500).end("Internal Server Error");
//         });
// });

// function sleep(ms: number) {
//     return new Promise(resolve => setTimeout(resolve, ms));
// }

// app.get('/analyze', (req, res)) {
//     requestQueue.push({ req, res });
    
//     res.status(200).send("Request correctly analyzed!");
// }

// // startConsumer(queueName, async (channel) => {
// //     while(!stop) {
// //         const msg: ConsumeMessage = await dequeue();
// //         const taskData: TaskType = JSON.parse(msg.content.toString());
// //         const id = taskData.data;
// //         const start = new Date();
// //         const remaining = await subscriber.decr(id);
// //         const stop = new Date();
// //         const elapsed = stop.getTime() - start.getTime();
// //         const delay = Math.max(0, interval - elapsed);
// //         await sleep(delay);
// //         await ackEnqueue(msg);
// //         if (remaining == 0) {
// //             console.log("Sending to image analyzer: ", taskData);
// //             addInQueue(exchangeName, queueTypeOutImageAnalyzer, taskData);
// //         }
// //     }
// // });

// process.on('SIGINT', async () => {
//     console.log(' [*] Exiting...');
//     cancelConnection();
//     while(pendingPromises.length > 0 || queue.length > 0) await sleep(1000);
//     await RabbitMQConnection.close();
//     subscriber.disconnect();
//     await sleep(5000);
//     process.exit(0);
// });

//////////////////



import {uuid as v4} from "uuidv4";
import express, { Application } from 'express';
import * as prometheus from 'prom-client';
import Redis from 'ioredis';
import {uuid as v4} from "uuidv4";

type StreamEntry = [string, string[]];
type RedisResponse = [string, StreamEntry[]][];

const mcl = parseInt(process.env.MCL as string, 10);
let stop = false;
const consumerName = v4();
const app: Application = express();
const port: string | 8004 = process.env.PORT || 8004;
const limit = parseInt(process.env.LIMIT as string, 10) || 200;
const batch = parseInt(process.env.BATCH as string, 10) || mcl;

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


function publishMessage(streamName: string, message: Record<string, string>) {
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
    while (!stop) {
      const messages = await publisher.xreadgroup(
        'GROUP', 'image-recognizer-queue', consumerName,
        'COUNT', batch, 'BLOCK', 0, 
        'STREAMS', 'image-recognizer-stream', '>'
      ) as RedisResponse;
      if (messages.length > 0) {
        const [_, entries]: [string, StreamEntry[]] = messages[0];
        for (const [messageId, fields] of entries) {
            console.log(fields[1]);
            publisher.decr(fields[1]);
            publishMessage('image-analyzer-out-stream', {data: fields[1], time: fields[3]});
            publisher.xack('image-recognizer-stream', 'image-recognizer-queue', messageId);
            publisher.xdel('image-recognizer-stream', messageId);
            await sleep(800/mcl);  
        }
      }
    }
}


createConsumerGroup('image-recognizer-stream', 'image-recognizer-queue');
listenToStream();
  
 
app.listen(port, () => {
     console.log(`Image-recognizer launched ad http://localhost:${port}`);
});
 
 process.on('SIGINT', async () => {
     console.log(' [*] Exiting...');
     stop = true;
     await sleep(10000);
     publisher.disconnect();
     process.exit(0);
 });