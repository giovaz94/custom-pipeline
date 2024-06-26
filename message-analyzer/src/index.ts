import { closeConnection, startConsumer} from "./queue/queue";
import express, {Application} from "express";
import * as prometheus from 'prom-client';

import Redis from 'ioredis';
import Redlock from "redlock";


const queueName = process.env.QUEUE_NAME || 'messageanalyzer.queue';
const interval = 1000/parseInt(process.env.MCL as string, 10);
const dbUrl = process.env.DB_URL || 'http://localhost:3200';

const app: Application = express();
const port: string | 8006 = process.env.PORT || 8006;

app.listen(port, () => {
    console.log(`Message parser service launched ad http://localhost:${port}`);
});

const publisher = new Redis({
    host:  process.env.REDIS_HOST || 'redis',
    port: 6379,
});

const redlock = new Redlock(
  [publisher],
    {
        driftFactor: 0.01,
        retryCount: 10,
        retryDelay: 200,
        retryJitter: 200
    }
);

const requestsTotalTime = new prometheus.Counter({
    name: 'http_response_time_sum',
    help: 'Response time sum'
})

const messageLost = new prometheus.Counter({
    name: 'services_message_lost',
    help: 'Number of messages lost'
});


const completedMessages = new prometheus.Counter({
    name: 'message_analyzer_complete_message',
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
function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
startConsumer(queueName,(task) => {
    const dateStart = new Date();

    sleep(interval).then(() => {
        if(typeof task.data === 'object') {
            console.log('Virus:', task.data);
        } else {
            console.log('Attachment:', task.data)
        }
        let id = typeof task.data === 'string' ? task.data : task.data.id;
        publisher.decr(id).then(res => {
            if (res == 0) {
                publisher.del(id).then(deleted => {
                    if (deleted > 0) {
                        completedMessages.inc();
                        console.log('Message:', id, 'completed');
                    }
                });
            }
        });
    }).finally(() => {
        const dateEnd = new Date();
        const secondsDifference = dateEnd.getTime() - dateStart.getTime();
        requestsTotalTime.inc(secondsDifference);
    }).catch(error => {
        messageLost.inc();
    });
});

process.on('SIGINT', () => {
    console.log(' [*] Exiting...');
    closeConnection();
    process.exit(0);
});



