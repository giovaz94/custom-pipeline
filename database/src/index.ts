import express, { Request, Response, Application } from 'express';
import { DB } from './db/database';
import {uuid as v4} from "uuidv4";


const app: Application = express();
const port: string | 3200 = process.env.PORT || 3200;
const db = new DB();

app.use(express.json());


app.post('/insertInfo', (req, res) => {
    try {
        const n_attach: number = req.body.n_attach;
        const id: string = v4();
        db.insertMessageInformation(id, n_attach);
        res.status(200).json({ message: 'Message information added', id: id});
    } catch (error) {res.status(500).json({ error: error });}
});

app.post('/insertResult', (req, res) => {
    try {
        const id = req.body.id;
        const activity_left = db.insertResult(id);
        res.status(200).json({ message: 'Message result added, activity left ' + activity_left, activity_left: activity_left});
    } catch (error) {res.status(500).json({ error: error });}
});

app.post('/returnResult', (req, res) => {
    try {
        const id = req.body.id;
        const result = db.returnMessageResults(id);
        res.status(200).json({ message: result});
    } catch (error) {res.status(500).json({ error: error });}
});

app.post('/messageLoss', (req, res) => {
    try {
        const id = req.body.id;
        db.messageLoss(id);
        res.status(200).json({ message: 'Message loss'});
    } catch (error)
        {res.status(500).json({ error: error });
    }
});


setInterval(() => {
    console.log(`Average latency: ${db.returnAverageAnalysisTime()} \t Rejected messages: ${db.rejectedMessages()}`);
}, 10000);

app.listen(port, () => {
    console.log(`Database service launched ad http://localhost:${port}`);
});