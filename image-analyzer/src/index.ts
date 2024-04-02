import {addInQueue, closeConnection, startConsumer} from "./queue/queue";
import express, { Application } from 'express';
import * as prometheus from 'prom-client';
import Redis from 'ioredis';

const app: Application = express();
const port: string | 8003 = process.env.PORT || 8003;

const queueName = process.env.QUEUE_NAME || 'imageanalyzer.queue';
const interval = 1000/parseInt(process.env.MCL as string, 10);
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';

const queueTypeImageRecognizer = process.env.QUEUE_IMAGE_RECOGNIZER || 'imagerec.req';
const queueTypeNsfwDetector = process.env.QUEUE_IMAGE_RECOGNIZER || 'nsfwdet.req';
const queueTypeMessageAnalyzer = process.env.QUEUE_IMAGE_RECOGNIZER || 'messageanalyzer.req';

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

const requests = new prometheus.Counter({
    name: 'http_requests_total_image_analyzer',
    help: 'Total number of HTTP requests',
});

const requestsTotalTime = new prometheus.Counter({
    name: 'http_response_time_sum',
    help: 'Response time sum'
});

const messageLost = new prometheus.Counter({
    name: 'services_message_lost',
    help: 'Number of messages lost'
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

app.listen(port, () => {
    console.log(`Message parser service launched ad http://localhost:${port}`);
});
function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
subscriber.psubscribe("__keyevent*:*", (err, count) => {
    if (err) {
        console.error(err);
        return;
    }

});

subscriber.on('pmessage', (pattern, channel, message) => {
    const key = message.toString();
    publisher.hgetall(key, (err, result) => {
        if (err) {
            console.error('Error:', err);
            return;
        }
        if(result) {
            if (result.imageRecognizer === 'true' && result.nsfwDetector === 'true') {
                const taskToSend = {
                    data: key,
                    time: new Date().toISOString(),
                }
                addInQueue(exchangeName, queueTypeMessageAnalyzer, taskToSend, messageLost);
            } else {
                console.log(result);
            }
        }
    });
});

startConsumer(queueName, (task) => {
    let id = task.data;
    const dateStart = new Date();
    requests.inc();
    sleep(interval).then(() => {
        const taskToSend = {
            data: task.data,
            time: new Date().toISOString(),
            att_number: task.att_number
        }

        publisher.hmset(id, {imageRecognizer: false, nsfwDetector: false}, (err, res) => {
            if (err) {
                console.error('Error:', err);
                return;
            }
            console.log('res:', res);
            console.log('Task:', taskToSend);
            addInQueue(exchangeName, queueTypeImageRecognizer, taskToSend, messageLost);
            addInQueue(exchangeName, queueTypeNsfwDetector, taskToSend, messageLost);
        });

    }).finally(() => {
        const dateEnd = new Date();
        const secondsDifference = dateEnd.getTime() - dateStart.getTime();
        requestsTotalTime.inc(secondsDifference);
    })
});




process.on('SIGINT', () => {
    console.log(' [*] Exiting...');
    closeConnection();
    process.exit(0);
});
