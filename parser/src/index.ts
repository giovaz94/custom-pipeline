import express, { Express, Request, Response , Application } from 'express';
import axios from "axios";

const app: Application = express();
const port: string | 8000 = process.env.PORT || 8000;
const interval: number = 1000/parseInt(process.env.MCL || "1", 10);

const db_url: string = process.env.DB_URL || "http://localhost:8001";
const my_queue_url: string = process.env.MY_QUEUE_URL || "http://localhost:8002";
const next_queue_url: string = process.env.NEXT_QUEUE_URL || "http://localhost:8003";

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

app.use(express.json());
app.post('/parse', async (_req, res) => {
    try {
        console.log("parsing...");
        await sleep(interval);
        let n_attach = Math.floor(Math.random() * 5);
        let postDbResponse = await  axios.post(db_url + "/insertInfo", {n_attach: n_attach});

        const id = postDbResponse.data.id;
        for (let i: number = 0; i < n_attach; i++) {
            let enqueueResponse = await axios.post(next_queue_url + '/enqueue', {id: id});
            console.log(`Enqueue response ${i}: ${enqueueResponse.data.message}`);
        }

        await axios.post(my_queue_url + "/dequeue");//.then(response => console.log(response.data));
        res.json({ message: 'Parse request received successfully'});
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});
app.listen(port, () => {
    console.log(`Message parser launched at http://localhost:${port}`);
});


