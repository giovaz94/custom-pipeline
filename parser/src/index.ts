import {addInQueue, closeConnection, startConsumer, TaskType} from "./queue/queue";
import express, {Application} from 'express';
import axios from "axios";
import * as prometheus from 'prom-client';

const dbUrl = process.env.DB_URL || 'http://localhost:3200';
const queueName = process.env.QUEUE_NAME || 'parser.queue';
const queueType = process.env.QUEUE_TYPE || 'virusscan.req';
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';

const interval = 1000/parseInt(process.env.MCL as string, 10);

const app: Application = express();
const port: string | 8011 = process.env.PORT || 8011;

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

app.listen(port, () => {
    console.log(`Message parser service launched ad http://localhost:${port}`);
});

const requests = new prometheus.Counter({
    name: 'http_requests_total_virus_scanner',
    help: 'Total number of HTTP requests',
});

const requestsTotalTime = new prometheus.Counter({
    name: 'http_response_time_sum',
    help: 'Response time sum'
})

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

startConsumer(queueName, (task: TaskType) => {
    const dateStart = new Date();
    sleep(interval).then(() => {
        let id;
        //const n_attach = Math.floor(Math.random() * 5);
        requests.inc();
        const n_attach = 1;
        /*const insertInfoUrl = dbUrl + "/insertInfo";
        axios.post(insertInfoUrl, {n_attach: n_attach}).then((response) => {
            id = response.data.id;
            for (let i = 0; i < n_attach; i++) {
                const message = {
                    data: id,
                    time: new Date().toISOString(),
                    att_number: i + 1
                }
                addInQueue(exchangeName, queueType, message, messageLost);
            }
        })*/
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
