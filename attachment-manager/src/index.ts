import express, { Application } from 'express';
import * as prometheus from 'prom-client';
import Redis from 'ioredis';
import {uuid as v4} from "uuidv4";

type StreamEntry = [string, string[]];
type RedisResponse = [string, StreamEntry[]][];
type TaskType = {
    data: string;
}
const mcl = parseInt(process.env.MCL as string, 10);
//const interval = 900/parseInt(process.env.MCL as string, 10);
const consumerName = v4();
const app: Application = express();
const port: string | 8002 = process.env.PORT || 8002;
const requests = new prometheus.Counter({
    name: 'http_requests_total_image_analyzer_counter',
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
        'GROUP', 'attachment-manager-queue', consumerName,
        'COUNT', mcl, 'BLOCK', 0, 
        'STREAMS', 'attachment-manager-stream', '>'
      ) as RedisResponse;
      if (messages.length > 0) {
        const [_, entries]: [string, StreamEntry[]] = messages[0];
        requests.inc(entries.length);
        entries.forEach(async ([messageId, fields]) => {
            console.log(fields[1]);
            publishMessage('image-analyzer-stream', {data: fields[1], time: fields[3]}).catch(console.error);
            publisher.xack('attachment-manager-stream', 'attachment-manager-queue', messageId);
            await sleep(1000/mcl);        
        });
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
    publisher.disconnect();
    process.exit(0);
});