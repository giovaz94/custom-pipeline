import express, {Request, Response , Application } from 'express';
import {addInQueue, closeConnection, TaskType} from "./queue/queue";
import * as prometheus from 'prom-client';

const app: Application = express();
const port: string | 8010 = process.env.PORT || 8010;
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';
const queueType = process.env.QUEUE_TYPE || 'parser.req';
const dbUrl = process.env.DB_URL || 'http://localhost:3200';
app.use(express.json());

const REFRESH_TIME = parseInt(process.env.REFRESH_TIME as string, 10) || 10000;
const requests = new prometheus.Counter({
    name: 'http_requests_total_entrypoint',
    help: 'Total number of HTTP requests',
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

app.post('/', async (req: Request, res: Response) => {
    const task: TaskType = {
        data: req.body.id,
        time: new Date().toISOString()
    }
    try {
        requests.inc();
        addInQueue(exchangeName, queueType, task);
    } catch (error: any) {
        res.status(500).send(`Error submitting the request to the queue: ${error.message}`);
        return;
    }
    return res.status(201).send("Request correctly submitted to the entrypoint!");
});

// Spostare su monitor
/*setInterval(async () => {
    const counter = RequestCounter.getInstance();
    const registerInboundWorkload = dbUrl + "/inboundWorkload";
    const inboundWorkload = RequestCounter.getInstance().getCount()/ (REFRESH_TIME * 0.001);
    lastRegisteredWorkload = inboundWorkload;
    try {
        axios.post(registerInboundWorkload, {requests: inboundWorkload});
    } catch (error: any) {
        console.log(` ~[X] Error submitting the request to the queue: ${error.message}`);
    }
    RequestCounter.getInstance().reset();
}, REFRESH_TIME); */


/*app.get('/inbound-workload', async (req: Request, res: Response) => {
    const inboundWorkload = RequestCounter.getInstance().getCount()/ (REFRESH_TIME * 0.001);
    RequestCounter.getInstance().reset();
    return res.status(200).send({
        inboundWorkload: inboundWorkload
    });
});*/

app.listen(port, () => {
    console.log(`Queue service launhed ad http://localhost:${port}`);
    console.log(`Refresh time: ${REFRESH_TIME * 0.001}s`);
});

process.on('SIGINT', () => {
    console.log('[*] Exiting...');
    closeConnection();
    process.exit(0);
});
