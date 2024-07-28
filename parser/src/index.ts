import express, {Application} from 'express';
import Redis from 'ioredis';
import {uuid as v4} from "uuidv4";
import * as prometheus from 'prom-client';

type StreamEntry = [string, string[]];
type RedisResponse = [string, StreamEntry[]][];

const mcl = parseInt(process.env.MCL as string, 10);
//const interval = 900/parseInt(process.env.MCL as string, 10);
const app: Application = express();
const port: string | 8011 = process.env.PORT || 8011;
const consumerName = v4();
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

async function publishMessage(streamName: string, message: Record<string, string>): Promise<void> {
    publisher.xadd(streamName, '*', ...Object.entries(message).flat());
    console.log(`Message published to stream ${streamName}`);
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
        'GROUP', 'parser-queue', consumerName,
        'COUNT', mcl, 'BLOCK', 0, 
        'STREAMS', 'parser-stream', '>'
      ) as RedisResponse;

      if (messages.length > 0) {
        const [stream, entries]: [string, StreamEntry[]] = messages[0];
        entries.forEach(async ([messageId, _]) => {
            const id = v4();
            const n_attach = Math.floor(Math.random() * 5);
            const start: Date =  new Date();
            console.log(id + " has " + n_attach + " attachments");
            // @ts-ignore
            if(n_attach == 0) {
                request_message_analyzer.inc();
                publisher.set(id, 1);
                publishMessage('message-analyzer-stream', {data: id, time: start.toISOString()}).catch(console.error);
            } else {
                vs_requests.inc(n_attach);
                publisher.set(id, n_attach);
                for (let i = 0; i < n_attach; i++) {
                    publishMessage('virus-scanner-stream', {data: id, time: start.toISOString()}).catch(console.error);
                }
            }
            publisher.xack('parser-stream', 'parser-queue', messageId);
            await sleep(1000/mcl);


        });
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
    publisher.disconnect();
    process.exit(0);
});
