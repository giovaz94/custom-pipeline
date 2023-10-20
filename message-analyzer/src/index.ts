import {addInQueue, startConsumer} from "./queue/queue";
import axios from "axios";

const queueName = process.env.QUEUE_NAME || 'messageanalyzer.queue';
const interval = 1000/parseInt(process.env.MCL as string, 10);
const dbUrl = process.env.DB_URL || 'http://localhost:3200';

console.log(process.env.MCL);

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

startConsumer(queueName, async (task) => {
    console.log(` ~[*] Received a new request wit id ${task.data}`);
    try {
        await sleep(interval);
        axios.post(dbUrl + '/insertResult', {id: task.data}).then(response => {
            console.log(response.data.message);
            const activity_left = response.data.activity_left;
            if (activity_left <= 0) {
                axios.post(dbUrl + '/returnResult', {id: task.data})
                    .then(response => console.log(response.data.message));
            }
        });
        console.log(` ~[!] Done processing image with id ${task.data}`);
    } catch (error: any) {
        console.log(` ~[X] Error submitting the request to the queue: ${error.message}`);
        return;
    }
});




