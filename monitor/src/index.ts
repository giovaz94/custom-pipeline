import express, { Request, Response, Application } from 'express';
import {uuid as v4} from "uuidv4";
import {BatchMetrics} from "./metrics/batchMetrics";


const app: Application = express();
const port: string | 3200 = process.env.PORT || 3200;

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE as string, 10) || 1000;
const RECORD_NUMBER = parseInt(process.env.RECORD_NUMBER as string, 10) || 10;
const REFRESH_TIME = parseInt(process.env.REFRESH_TIME as string, 10) || 3000;

const metrics = new BatchMetrics(BATCH_SIZE, RECORD_NUMBER);

app.use(express.json());

app.post('/insertInfo', (req, res) => {
    try {
        const n_attach: number = req.body.n_attach;
        const id: string = v4();
        metrics.insertMessageInformation(id, n_attach);
        res.status(200).json({ message: 'Message information added', id: id});
    } catch (error) {
        res.status(500).json({ error: error });
    }
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

app.post("/inboundWorkload", (req, res) => {
    try {
        const mcl = req.body.messages
        metrics.messageArrived();
        res.status(200).json({ message: 'Update inbound workload'});
    } catch (error) {
        res.status(500).json({ error: error });
    }
});

setInterval(() => {
    console.table(metrics.returnResults());
    console.log("Inbound workload: " + metrics.gerInboundWorkload());
}, REFRESH_TIME);

app.listen(port, () => {
    console.log(`Monitor service launched ad http://localhost:${port}`);
    console.log(`Batch size: ${BATCH_SIZE} \t  Record number: ${RECORD_NUMBER} \t Refresh time: ${REFRESH_TIME}`);
});