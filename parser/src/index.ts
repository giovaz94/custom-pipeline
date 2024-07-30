import express, {Application} from 'express';
import Redis from 'ioredis';
import {uuid as v4} from "uuidv4";
import * as prometheus from 'prom-client';

type StreamEntry = [string, string[]];
type RedisResponse = [string, StreamEntry[]][];

const mcl = parseInt(process.env.MCL as string, 10);
let stop = false;//const interval = 900/parseInt(process.env.MCL as string, 10);
const app: Application = express();
const port: string | 8011 = process.env.PORT || 8011;
const consumerName = v4();
const limit = parseInt(process.env.LIMIT as string, 10) || 200;
const batch = parseInt(process.env.BATCH as string, 10) || mcl;
const publisher = new Redis({
    host:  process.env.REDIS_HOST || 'redis',
    port: 6379,
});
const vs_requests = new prometheus.Counter({
    name: 'http_requests_total_virus_scanner_counter',
    help: 'Total number of HTTP requests',
});

const request_message_analyzer = new prometheus.Counter({
    name: 'http_requests_total_message_analyzer_counter',
    help: 'Total number of HTTP requests',
});


function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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

function publishMessage(streamName: string, message: Record<string, string>) {
    publisher.xlen(streamName).then(res => {
        if(res < limit) publisher.xadd(streamName, '*', ...Object.entries(message).flat());
        else  publisher.del(message['data']);
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
  

async function listenToStream() {
    while (!stop) {
      const start: Date =  new Date();
      const messages = await publisher.xreadgroup(
        'GROUP', 'parser-queue', consumerName,
        'COUNT', batch, 'BLOCK', 0, 
        'STREAMS', 'parser-stream', '>'
      ) as RedisResponse;

      if (messages.length > 0) {
        const [stream, entries]: [string, StreamEntry[]] = messages[0];
        const start = new Date();
        for (const [messageId, fields] of entries) {
            const id = v4();
            const streamName = 'virus-scanner-stream'
            const n_attach = Math.floor(Math.random() * 5);
            const createDate: Date =  new Date();
            console.log(id + " has " + n_attach + " attachments");
            const msg = {data: id, time: createDate.toISOString()}
            // @ts-ignore
            if(n_attach == 0) {
                request_message_analyzer.inc();
                publisher.set(id, 3);
                //publishMessage('message-analyzer-stream', {data: id, time: start.toISOString()});
            } else {
                vs_requests.inc(n_attach);
                publisher.set(id, 3+n_attach);
                for (let i = 0; i < n_attach; i++) {
                    const len = await publisher.xlen(streamName);
                    if(len < limit) await publisher.xadd(streamName, '*', ...Object.entries(msg).flat());
                    else  publisher.del(msg['data']);
                    //publishMessage('virus-scanner-stream', {data: id, time: start.toISOString()});
                }
            }
            let len;
            //publishMessage('header-analyzer-stream', {data: id, time: start.toISOString()});
            len = await publisher.xlen('header-analyzer-stream');
            if(len < limit) await publisher.xadd(streamName, '*', ...Object.entries(msg).flat());
            else  publisher.del(msg['data']);

            //publishMessage('link-analyzer-stream', {data: id, time: start.toISOString()});
            len = await publisher.xlen('link-analyzer-stream');
            if(len < limit) await publisher.xadd('link-analyzer-stream', '*', ...Object.entries(msg).flat());
            else  await publisher.del(msg['data']);

            //publishMessage('text-analyzer-stream', {data: id, time: start.toISOString()});
            len = await publisher.xlen('text-analyzer-stream');
            if(len < limit) await publisher.xadd('text-analyzer-stream', '*', ...Object.entries(msg).flat());
            else  publisher.del(msg['data']);

            const stop: Date =  new Date();
            publisher.xack('parser-stream', 'parser-queue', messageId);
            publisher.xdel('parser-stream', messageId);
            const elapsed = stop.getTime() - start.getTime();
            const delay = Math.max(0,800 - elapsed)
            await sleep(delay/mcl);
        }
      }
    }
}

createConsumerGroup('parser-stream', 'parser-queue');

listenToStream();

app.listen(port, () => {
    console.log(`Message parser service launched ad http://localhost:${port}`);
});

process.on('SIGINT', async () => {
    console.log(' [*] Exiting...');
    stop = true;
    await sleep(10000);
    publisher.disconnect();
    process.exit(0);
});
