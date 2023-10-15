import {startConsumer} from "./queue/queue";

const queueName = process.env.QUEUE_NAME || 'virusscan.queue';
const dbUrl = process.env.DB_URL || 'http://localhost:3200';

startConsumer(queueName, async (task) => {
   console.log(` ~[*] Received task: ${JSON.stringify(task)}`);
});

