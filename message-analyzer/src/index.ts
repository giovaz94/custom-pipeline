import {addInQueue, startConsumer} from "./queue/queue";

const queueName = process.env.QUEUE_NAME || 'nsfwdet.queue';
const interval = 1000/parseInt(process.env.MCL as string, 10);


function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}




