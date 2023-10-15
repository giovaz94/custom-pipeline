import {addInQueue, startConsumer} from "./queue/queue";

const queueName = process.env.QUEUE_NAME || 'virusscan.queue';
const interval = 1000/parseInt(process.env.MCL as string, 10);
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';

function sleep(ms: number) {
   return new Promise(resolve => setTimeout(resolve, ms));
}

startConsumer(queueName, async (task) => {
   await sleep(interval);
   const isVirus = Math.floor(Math.random() * 4) === 0;
   const targetType = isVirus ? 'messageanalyzer.req' : 'attachmentman.req';
   addInQueue(exchangeName, targetType, task); // Re-routing the request
});

