import express, { Express, Request, Response , Application } from 'express';
import {addInQueue, startConsumer, TaskType} from "./queue/queue";

const app: Application = express();
const port: string | 8000 = process.env.PORT || 8000;
const queueName = process.env.QUEUE_NAME || 'demo-queue';

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

app.use(express.json());
app.post('/parse', async (req: Request, res: Response) => {
    try {
        const taskToSubmit: TaskType = {
            data: req.body.id,
            time: new Date().toString()
        }

        await addInQueue(queueName, taskToSubmit);
        console.log(" ~[*] Task submitted to the queue successfully! ");

        res.status(200).send("Task submitted to the queue successfully!");
    } catch (error) {
        console.log(error);
        res.status(500).send("Error sending the request");
    }
});

app.listen(port, () => {
    startConsumer(queueName, async (task: TaskType) => {
        console.log(` ~[X] Task processed at ${new Date().toString()}`);
    });
    console.log(`Message parser launched at http://localhost:${port}`);
});


