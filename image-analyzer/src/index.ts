import {addInQueue, closeConnection, startConsumer} from "./queue/queue";
import express, { Application } from 'express';
import * as prometheus from 'prom-client';
import Redis from 'ioredis';

const app: Application = express();
const port: string | 8003 = process.env.PORT || 8003;

app.use(express.json());

const inputQueueName = process.env.INPUT_QUEUE_NAME || 'imageanalyzer.queue';
const outputQueueName = process.env.OUTPUT_QUEUE_NAME || 'imageanalyzer.out.queue';

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

app.post("/response", (req, res) => {
    const id = req.body.id;
    const service = req.body.service;
    const att_number = req.body.att_number;
    console.log('Received response:', id, service, att_number)
    if (service === 'imageRecognizer') {
        publisher.hset(id, {imageRecognizer: true}, (err, res) => {
            if (err) {
                console.log(err);
                messageLost.inc();
            }
        });
    } else if (service === 'nsfwDetector') {
        publisher.hset(id, {nsfwDetector: true}, (err, res) => {
            if (err) {
                console.log(err);
                messageLost.inc();
            }
        });
    }

    publisher.hgetall(id, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return;
        }

        if (response && (response.imageRecognizer && response.nsfwDetector)) {
            const response = {
                data : id,
                time: new Date().toISOString(),
                att_number: att_number
            }
            addInQueue(exchangeName, queueTypeMessageAnalyzer, response, messageLost);
        }
    });
    return res.status(200).send('OK');
});

app.listen(port, () => {
    console.log(`Message parser service launched ad http://localhost:${port}`);
});
function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

startConsumer(outputQueueName, (task) => {
    const id = task.data.id;
    const service = task.data.service;
    const att_number = task.att_number;

    if (service === 'imageRecognizer') {
        publisher.hset(id, {imageRecognizer: true}, (err, res) => {
            if (err) {
                console.log(err);
                messageLost.inc();
            }
        });
    } else if (service === 'nsfwDetector') {
        publisher.hset(id, {nsfwDetector: true}, (err, res) => {
            if (err) {
                console.log(err);
                messageLost.inc();
            }
        });
    }

    publisher.hgetall(id, (err, response) => {
        if (err) {
            console.error('Error:', err);
            return;
        }

        if (response && (response.imageRecognizer && response.nsfwDetector)) {
            const response = {
                data : id,
                time: new Date().toISOString(),
                att_number: att_number
            }
            addInQueue(exchangeName, queueTypeMessageAnalyzer, response, messageLost);
        }
    });
});


startConsumer(inputQueueName, (task) => {
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
