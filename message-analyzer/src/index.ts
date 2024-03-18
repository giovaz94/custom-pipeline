import { closeConnection, startConsumer} from "./queue/queue";
import axios from "axios";
import express, {Application} from "express";
import * as prometheus from 'prom-client';

const queueName = process.env.QUEUE_NAME || 'messageanalyzer.queue';
const interval = 1000/parseInt(process.env.MCL as string, 10);
const dbUrl = process.env.DB_URL || 'http://localhost:3200';

const app: Application = express();
const port: string | 8006 = process.env.PORT || 8006;

app.listen(port, () => {
    console.log(`Message parser service launched ad http://localhost:${port}`);
});

const requests = new prometheus.Counter({
    name: 'http_requests_total_message_analyzer',
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
    requests.inc();

    sleep(interval).then(() => {
        if(typeof task.data === 'object') {
            console.log('Virus:', task.data);
        } else {
            console.log('Attachment:', task.data)
        }
        let id = typeof task.data === 'string' ? task.data : task.data.id;


        axios.post(dbUrl + '/insertResult', {id: task.data}).then(response => {
            const activity_left = response.data.activity_left;
            console.log('Activity left:', activity_left)
            if (activity_left <= 0) {
                completedMessages.inc();
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



