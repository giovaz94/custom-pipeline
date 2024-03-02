import {addInQueue, closeConnection, startConsumer} from "./queue/queue";
import axios from "axios";
import express, {Request, Response, Application} from "express";
import RequestCounter from "./req-counter/req.counter";

const queueName = process.env.QUEUE_NAME || 'messageanalyzer.queue';
const interval = 1000/parseInt(process.env.MCL as string, 10);
const dbUrl = process.env.DB_URL || 'http://localhost:3200';

let requestCounter = 0;
let lastRequestTime = new Date().getTime();

const app: Application = express();
const port: string | 8006 = process.env.PORT || 8006;

app.listen(port, () => {
    console.log(`Message parser service launched ad http://localhost:${port}`);
});

app.get('/inbound-workload', async (req: Request, res: Response) => {
    const now = new Date().getTime();
    const secondsElapsed = (now - lastRequestTime) / 1000;
    const inboundWorkload = RequestCounter.getInstance().getCount() / secondsElapsed;

    lastRequestTime = new Date().getTime();
    RequestCounter.getInstance().reset();
    return res.status(200).send({
        inboundWorkload: inboundWorkload
    });
});

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

startConsumer(queueName, async (task) => {
    try {
        sleep(interval).then(() => {
            axios.post(dbUrl + '/insertResult', {id: task.data}).then(response => {
                const activity_left = response.data.activity_left;
                if (activity_left <= 0) {
                    axios.post(dbUrl + '/returnResult', {id: task.data})
                        .then(response => console.log(response.data.message));
                }
            });
        });
    } catch (error: any) {
        console.log(` ~[X] Error submitting the request to the queue: ${error.message}`);
        return;
    }
});

process.on('SIGINT', () => {
    console.log(' [*] Exiting...');
    closeConnection();
    process.exit(0);
});



