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
const port: string | 8002 = process.env.PORT || 8002;
const limit = parseInt(process.env.LIMIT as string, 10) || 200;
const batch = parseInt(process.env.BATCH as string, 10) || mcl;

const baseDelay = parseInt(process.env.DELAY as string, 10) || 700;
const requests = new prometheus.Counter({
    name: 'http_requests_total_image_analyzer_counter',
    help: 'Total number of HTTP requests',
});
const loss = new prometheus.Counter({
    name: 'message_loss',
    help: 'Message Loss',
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

// function publishMessage(streamName: string, message: Record<string, string>) {
//     publisher.xlen(streamName).then(res => {
//         if(res < limit) publisher.xadd(streamName, '*', ...Object.entries(message).flat());
//         else publisher.del(message['data']);
//     });
// }
 
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
      const start = new Date();
      const messages = await publisher.xreadgroup(
        'GROUP', 'attachment-manager-queue', consumerName,
        'COUNT', batch, 'BLOCK', 0, 
        'STREAMS', 'attachment-manager-stream', '>'
      ) as RedisResponse;

      if (messages.length > 0) {
        const [_, entries]: [string, StreamEntry[]] = messages[0];
        requests.inc(entries.length);
        for (const [messageId, fields] of entries) {
            const start = new Date();
            console.log(fields[1]);
            let res;
            const msg = {data: fields[1], time: fields[3]}

            // publishMessage('image-analyzer-stream', {data: fields[1], time: fields[3]});
            res = await publisher.xlen('image-analyzer-stream');
            if(res < limit) await publisher.xadd('image-analyzer-stream', '*', ...Object.entries(msg).flat());
            else {
                publisher.del(fields[1]).then(res => {
                    if (res > 0) loss.inc();
                });
            }

            const stop: Date =  new Date();
            publisher.xack('attachment-manager-stream', 'attachment-manager-queue', messageId);
            publisher.xdel('attachment-manager-stream', messageId);
            const elapsed = stop.getTime() - start.getTime();
            const delay = Math.max(0,baseDelay - elapsed)
            await sleep(delay/mcl);
        }
      }
    }
 }
 
 
 
createConsumerGroup('attachment-manager-stream', 'attachment-manager-queue');
listenToStream();
 

app.listen(port, () => {
    console.log(`Attachment-manager launched ad http://localhost:${port}`);
});

process.on('SIGINT', async () => {
    console.log(' [*] Exiting...');
    stop = true;
    await sleep(10000);
    publisher.disconnect();
    process.exit(0);
});