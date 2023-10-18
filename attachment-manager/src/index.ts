import {addInQueue, startConsumer} from "./queue/queue";
import axios from "axios";

const queueName = process.env.QUEUE_NAME || 'attachmentman.queue';
const interval = 1000/parseInt(process.env.MCL as string, 10);
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';
const queueType = process.env.QUEUE_TYPE || 'imageanalyzer.req';
const dbUrl = process.env.DB_URL || 'http://localhost:3200';

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
        addInQueue(exchangeName, queueType, taskToSend);
        console.log(` ~[!] Request handled successfully!`);
    } catch (error: any) {
        if(error.message == "message nacked") {
            const lossResponse = await axios.post(dbUrl + "/messageLoss", {id: id});
            console.log(` ~[X] Error submitting the request to the queue, message loss: ${lossResponse.data.message}`);
        } else {
            console.log(` ~[X] Error submitting the request to the queue: ${error.message}`);
        }
        return;
    }
});

