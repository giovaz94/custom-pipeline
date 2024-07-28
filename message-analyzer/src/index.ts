import express, {Application} from "express";
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
const app: Application = express();
const port: string | 8006 = process.env.PORT || 8006;
const consumerName = v4();

const publisher = new Redis({
    host:  process.env.REDIS_HOST || 'redis',
    port: 6379,
});

const requestsTotalTime = new prometheus.Counter({
    name: 'http_requests_total_time',
    help: 'Response time sum'
});

const completedMessages = new prometheus.Counter({
    name: 'http_requests_total_global',
    help: 'Total number of completed messages',
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
async function createConsumerGroup(streamName: string, groupName: string): Promise<void> {
    try {
        publisher.xgroup('CREATE', streamName, groupName, '$', 'MKSTREAM');
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
        'GROUP', 'message-analyzer-queue', consumerName,
        'COUNT', mcl, 'BLOCK', 0, 
        'STREAMS', 'message-analyzer-stream', '>'
      ) as RedisResponse;
      if (messages.length > 0) {
        const [_, entries]: [string, StreamEntry[]] = messages[0];
        for (const [messageId, fields] of entries) {
            let id = fields[1];
            publisher.decr(id).then(res => {
                if (res == 0) {
                    const now = new Date();
                    completedMessages.inc();
                    const time = new Date(fields[3]);
                    const diff = now.getTime() - time.getTime();
                    console.log(id + " completed in " + diff);
                    requestsTotalTime.inc(diff);
                    publisher.del(id);
                }
            });
            publisher.xack('message-analyzer-stream', 'message-analyzer-queue', messageId);
            await sleep(1000/mcl);
        };
      }
    }
}
 
createConsumerGroup('message-analyzer-stream', 'message-analyzer-queue');
 
listenToStream();

app.listen(port, () => {
    console.log(`Message parser service launched ad http://localhost:${port}`);
});

process.on('SIGINT', async () => {
    console.log(' [*] Exiting...');
    publisher.disconnect();
    process.exit(0);
});




