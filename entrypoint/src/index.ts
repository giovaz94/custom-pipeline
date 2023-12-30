import express, { Express, Request, Response , Application } from 'express';
import {addInQueue, closeConnection, TaskType} from "./queue/queue";
import axios from "axios";

const app: Application = express();
const port: string | 8010 = process.env.PORT || 8010;
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';
const queueType = process.env.QUEUE_TYPE || 'parser.req';
const dbUrl = process.env.DB_URL || 'http://localhost:3200';
let requestCounter = 0;
let currentSecond = Math.floor(Date.now() / 1000);

app.use(express.json());

app.post('/', async (req: Request, res: Response) => {
    requestCounter++;
    const secondNow = Math.floor(Date.now() / 1000);
    if (secondNow !== currentSecond) {
        await axios.post(dbUrl + "/inboundWorkload", {requests: requestCounter});
        requestCounter = 0;
        currentSecond = secondNow;
    }
    const task: TaskType = {
        data: req.body.id,
        time: new Date().toISOString()
    }
    try {
        addInQueue(exchangeName, queueType, task);
    } catch (error: any) {
        console.log(` ~[X] Error submitting the request to the queue: ${error.message}`);
        return res.status(500).send(`Error submitting the request to the queue: ${error.message}`);
    }
    //console.log(" ~[!] Request submitted to the entrypoint successfully!");
    return res.status(201).send("Request correctly submitted to the entrypoint!");
});

app.listen(port, () => {
    console.log(`Queue service launched ad http://localhost:${port}`);
});

process.on('SIGINT', () => {
    console.log('[*] Exiting...');
    closeConnection();
    process.exit(0);
});
