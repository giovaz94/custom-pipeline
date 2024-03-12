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

app.post('/', async (req: Request, res: Response) => {
    const task: TaskType = {
        data: req.body.id,
        time: new Date().toISOString()
    }
    requests.inc();
    try {
        addInQueue(exchangeName, queueType, task);
    } catch (error: any) {
        messageLost.inc()
        res.status(500).send(`Error submitting the request to the queue: ${error.message}`);
        return;
    }
    return res.status(201).send("Request correctly submitted to the entrypoint!");
});


app.listen(port, () => {
    console.log(`Queue service launhed ad http://localhost:${port}`);
    console.log(`Refresh time: ${REFRESH_TIME * 0.001}s`);
});

process.on('SIGINT', () => {
    console.log('[*] Exiting...');
    closeConnection();
    process.exit(0);
});
