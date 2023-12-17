import {addInQueue, closeConnection, startConsumer, TaskType} from "./queue/queue";
import axios from "axios";
const dbUrl = process.env.DB_URL || 'http://localhost:3200';
const queueName = process.env.QUEUE_NAME || 'parser.queue';
const queueType = process.env.QUEUE_TYPE || 'virusscan.req';
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';

const interval = 1000/parseInt(process.env.MCL as string, 10);

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

startConsumer(queueName, async (task: TaskType) => {
    console.log(` ~[*] New request received!`);
    await sleep(interval);
    let id;
    try {
        const n_attach = Math.floor(Math.random() * 5);
        const insertInfoUrl = dbUrl + "/insertInfo";
        const insertResponse= await axios.post(insertInfoUrl, {n_attach: n_attach});
        id = insertResponse.data.id;
        for (let i = 0; i < n_attach; i++) {
            await addInQueue(exchangeName, queueType, {data: id, time: new Date().toISOString()});
        }
    } catch (error: any) {
        console.log(` ~[X] Error submitting the request to the queue: ${error.message}`);
        return;
    }
    console.log(` ~[!] Request handled successfully!`);
});

process.on('SIGINT', () => {
    console.log(' [*] Exiting...');
    closeConnection();
    process.exit(0);
});
