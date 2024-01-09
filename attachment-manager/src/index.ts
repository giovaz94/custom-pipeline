import {addInQueue, startConsumer, closeConnection} from "./queue/queue";

const queueName = process.env.QUEUE_NAME || 'attachmentman.queue';
const interval = 1000/parseInt(process.env.MCL as string, 10);
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';
const queueType = process.env.QUEUE_TYPE || 'imageanalyzer.req';
function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

startConsumer(queueName, async (task) => {
    console.log(` ~[*] New request received!`);
    await sleep(interval);
    const id = task.data;
    try {
        const taskToSend = {
            data: id,
            time: new Date().toISOString()
        }
        await addInQueue(exchangeName, queueType, taskToSend);
        console.log(` ~[!] Request handled successfully!`);
    } catch (error: any) {
        console.log(` ~[X] Error submitting the request to the queue: ${error.message}`);
        return;
    }
});

process.on('SIGINT', () => {
    console.log(' [*] Exiting...');
    closeConnection();
    process.exit(0);
});
