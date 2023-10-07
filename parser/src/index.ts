import {startConsumer} from "./queue/queue";

const queueName = process.env.QUEUE_NAME || 'parser.queue';

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

startConsumer(queueName, async (task) => {
    console.log(` ~[*] Received task: ${JSON.stringify(task)}`);
    await sleep(5000);
    console.log(` ~[*] Task processed successfully!`);
});
