import express, { Application } from 'express';
import * as prometheus from 'prom-client';
import Redis from 'ioredis';
import {uuid as v4} from "uuidv4";

type StreamEntry = [string, string[]];
type RedisResponse = [string, StreamEntry[]][];

const mcl = parseInt(process.env.MCL as string, 10);
let stop = false;//const interval = 900/parseInt(process.env.MCL as string, 10);
const app: Application = express();
const port: string | 8001 = process.env.PORT || 8001;
const consumerName = v4();
const limit = parseInt(process.env.LIMIT as string, 10) || 200;
const request_message_analyzer = new prometheus.Counter({
   name: 'http_requests_total_message_analyzer_counter',
   help: 'Total number of HTTP requests',
});
const requests_attachment_manager = new prometheus.Counter({
   name: 'http_requests_total_attachment_manager_counter',
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
   const pending = await publisher.xpending(streamName, streamName == 'attachment-manager-stream' ? 'attachment-manager-queue' : 'message-analyzer-queue');
   if (Number(pending[0]) < limit) publisher.xadd(streamName, '*', ...Object.entries(message).flat());
   else publisher.del(message['data']);
 
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
       'GROUP', 'virus-scanner-queue', consumerName,
       'COUNT', mcl, 'BLOCK', 0, 
       'STREAMS', 'virus-scanner-stream', '>'
     ) as RedisResponse;
     if (messages.length > 0) {
       const [_, entries]: [string, StreamEntry[]] = messages[0];
       for (const [messageId, fields] of entries) {
         const isVirus = Math.floor(Math.random() * 4) === 0;
         if (isVirus) console.log(fields[1] + " has virus");
         else console.log(fields[1] + ' is virus free');
         const targetType = isVirus ? 'message-analyzer-stream' : 'attachment-manager-stream';
         const metric = isVirus ? request_message_analyzer : requests_attachment_manager;
         metric.inc();
         publishMessage(targetType, {data: fields[1], time: fields[3]}).catch(console.error);
         publisher.xack('virus-scanner-stream', 'virus-scanner-queue', messageId);
         await sleep(850/mcl);
       };
     }
   }
}



createConsumerGroup('virus-scanner-stream', 'virus-scanner-queue');

listenToStream();

app.listen(port, () => {
    console.log(`Virus scanner service launched ad http://localhost:${port}`);
});

process.on('SIGINT', async () => {
    console.log(' [*] Exiting...');
    stop = true;
    await sleep(10000);
    publisher.disconnect();
    process.exit(0);
});

