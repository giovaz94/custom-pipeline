import express, { Request, Response, Application } from 'express';
import { Metrics } from './metrics/metrics';
import {uuid as v4} from "uuidv4";


const app: Application = express();
const port: string | 3200 = process.env.PORT || 3200;
const metrics = new Metrics();

app.use(express.json());

app.post('/insertInfo', (req, res) => {
    try {
        const n_attach: number = req.body.n_attach;
        const id: string = v4();
        metrics.insertMessageInformation(id, n_attach);
        res.status(200).json({ message: 'Message information added', id: id});
    } catch (error) {res.status(500).json({ error: error });}
});

app.post('/insertResult', (req, res) => {
    try {
        const id = req.body.id;
        const activity_left = metrics.insertResult(id);
        res.status(200).json({ message: 'Message result added, activity left ' + activity_left, activity_left: activity_left});
    } catch (error) {res.status(500).json({ error: error });}
});

app.post('/returnResult', (req, res) => {
    try {
        const id = req.body.id;
        const result = metrics.returnMessageResults(id);
        res.status(200).json({ message: result});
    } catch (error) {res.status(500).json({ error: error });}
});

app.post('/messageLoss', (req, res) => {
    try {
        const id = req.body.id;
        metrics.messageLoss(id);
        res.status(200).json({ message: 'Message loss'});
    } catch (error)
        {res.status(500).json({ error: error });
    }
});


setInterval(() => {
    console.log(`Average latency: ${metrics.returnAverageAnalysisTime()} \t Rejected messages: ${metrics.rejectedMessages()}`);
}, 10000);

app.listen(port, () => {
    console.log(`Database service launched ad http://localhost:${port}`);
});