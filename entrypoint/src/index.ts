import express, { Express, Request, Response , Application } from 'express';
import {addInQueue, TaskType} from "./queue/queue";

const app: Application = express();
const port: string | 8010 = process.env.PORT || 8010;

app.use(express.json());

app.post('/', async (req: Request, res: Response) => {
    console.log(" ~[*] New request received!");

    const task: TaskType = {
        data: req.body.id,
        time: new Date().toISOString()
    }
    const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';
    const queueType = process.env.QUEUE_TYPE || 'parser.req';

    try {
        await addInQueue(exchangeName, queueType, task);
    } catch (error: any) {
        console.log(` ~[X] Error submitting the request to the queue: ${error.message}`);
        res.status(500).send(`Error submitting the request to the queue: ${error.message}`);
        return;
    }
    console.log(" ~[*] Request submitted to the queue successfully!");
    res.status(201).send("Request correctly submitted to the queue!");
});


app.listen(port, () => {
    console.log(`Queue service launhed ad http://localhost:${port}`);
});
