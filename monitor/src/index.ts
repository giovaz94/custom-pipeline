import express, { Application } from 'express';
import {uuid as v4} from "uuidv4";
import {GlobalMetrics} from "./metrics/globalMetrics";
import { createObjectCsvWriter } from 'csv-writer';

const app: Application = express();
const port: string | 3200 = process.env.PORT || 3200;

const REFRESH_TIME = parseInt(process.env.REFRESH_TIME as string, 10) || 10_000;
const metrics = new GlobalMetrics();
const csvWriter = createObjectCsvWriter({
    path: 'metrics.csv',
    header: [
        {id: 'sec', title: 'Time(secs)'},
        {id: 'inbound_workload', title: 'Inbound workload'},
        {id: 'latency', title: 'Latency(ms)'},
        {id: 'message_loss', title: 'Message loss'},
        {id: 'deployed_instances', title: 'Deployed Instances'}
    ]
});

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
        const requests = req.body.requests;
        metrics.setInboundWorkload(requests);
        res.status(200).json({ message: 'Update inbound workload'});
    } catch (error) {
        res.status(500).json({ error: error });
    }
});

app.get("/inboundWorkload", (req, res) => {
    try {
        res.status(200).json({ inbound_workload: metrics.gerInboundWorkload()});
    } catch (error) {
        res.status(500).json({ error: error });
    }
});

app.post("/increaseService", (req, res) => {
    try {
        const serviceName = req.body.service;
        console.log(`Increase ${serviceName}`);
        metrics.increaseServiceCounter(serviceName);
        console.log(metrics.getStatistics().services);
        return res.status(200).json({message: "success"})
    } catch (error) {
        res.status(500).json({ error: error });
    }
});

app.post("/decreaseService", (req, res) => {
    try {
        const serviceName = req.body.service;
        console.log(`Decrease ${serviceName}`);
        metrics.decreaseServiceCounter(serviceName);
        console.log(metrics.getStatistics().services);
        return res.status(200).json({message: "success"})
    } catch (error) {
        res.status(500).json({ error: error });
    }
});


/**
 * Statistics
 **/
var sec= 0;
const writeData =  () => {
    // Calculate the total number of services
    const services : any = metrics.getStatistics().services

    let sum = 0;
    for (const key in services) {
        sum += services[key];
    }

    const data = [{
        sec: sec,
        inbound_workload: metrics.gerInboundWorkload(),
        latency: metrics.returnAverageAnalysisTime(),
        message_loss: metrics.getStatistics().rejectedMessages,
        deployed_instances: sum
    }];
    csvWriter.writeRecords(data).then(() => {
        sec += (REFRESH_TIME / 1000)
    });
    metrics.resetMetrics();
};

setInterval(writeData, REFRESH_TIME);

app.listen(port, () => {
    console.log(`Monitor service launched ad http://localhost:${port}`);
});

