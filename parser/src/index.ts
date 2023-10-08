import {startConsumer} from "./queue/queue";
import axios from "axios";

const queueName = process.env.QUEUE_NAME || 'parser.queue';
const dbUrl = process.env.DB_URL || 'http://localhost:3200';
console.log(dbUrl);
const interval = 1000/parseInt(process.env.MCL as string, 10);

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

startConsumer(queueName, async (task) => {
    console.log(` ~[*] Received task: ${JSON.stringify(task)}`);
    await sleep(interval);
    const n_attach = Math.floor(Math.random() * 5);
    const insertInfoUrl = dbUrl + "/insertInfo";
    await axios.post(insertInfoUrl, {n_attach: n_attach}).then(response => {
        const id = response.data.id;
        console.log(`   ~[*] Inserted ${n_attach} attachments with id ${id}`);
        /*for (let i = 0; i < n_attach; i++) { // TODO:Enqueue to next service }*/
    });
    console.log(` ~[*] Task processed successfully!`);
});
