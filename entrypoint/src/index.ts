import express, {Request, Response , Application } from 'express';
import {addInQueue, closeConnection, TaskType} from "./queue/queue";
import axios from "axios";

const app: Application = express();
const port: string | 8010 = process.env.PORT || 8010;
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';
const queueType = process.env.QUEUE_TYPE || 'parser.req';
const dbUrl = process.env.DB_URL || 'http://localhost:3200';
let requestCounter = 0;
app.use(express.json());

const REFRESH_TIME = parseInt(process.env.REFRESH_TIME as string, 10) || 10000;

app.post('/', async (req: Request, res: Response) => {
    const task: TaskType = {
        data: req.body.id,
        time: new Date().toISOString()
    }
    requestCounter++;
    try {
        addInQueue(exchangeName, queueType, task);
    } catch (error: any) {
        console.log(` ~[X] Error submitting the request to the queue: ${error.message}`);
        res.status(500).send(`Error submitting the request to the queue: ${error.message}`);
        return;
    }
    return res.status(201).send("Request correctly submitted to the entrypoint!");
});

setInterval(async () => {
    const registerInboundWorkload = dbUrl + "/inboundWorkload";
    const inboundWorkload = requestCounter / (REFRESH_TIME * 0.001);

    try {
        axios.post(registerInboundWorkload, {requests: inboundWorkload});
    } catch (error: any) {
        console.log(` ~[X] Error submitting the request to the queue: ${error.message}`);
    }
    requestCounter = 0;
}, REFRESH_TIME);

app.listen(port, () => {
    console.log(`Queue service launhed ad http://localhost:${port}`);
    console.log(`Refresh time: ${REFRESH_TIME * 0.001}s`);
});

process.on('SIGINT', () => {
    console.log('[*] Exiting...');
    closeConnection();
    process.exit(0);
});
