import {addInQueue, closeConnection, startConsumer} from "./queue/queue";
import axios from "axios";

const queueName = process.env.QUEUE_NAME || 'virusscan.queue';
const interval = 1000/parseInt(process.env.MCL as string, 10);
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';
const dbUrl = process.env.DB_URL || 'http://localhost:3200';

function sleep(ms: number) {
   return new Promise(resolve => setTimeout(resolve, ms));
}

startConsumer(queueName, async (task) => {
   console.log(` ~[*] New request received!`);
   await sleep(interval);
   const id = task.data;
   try {
      const isVirus = Math.floor(Math.random() * 4) === 0;
      const targetType = isVirus ? 'messageanalyzer.req' : 'attachmentman.req';
      const taskToSend = {
         data: task.data,
         time: new Date().toISOString()
      }
      await addInQueue(exchangeName, targetType, taskToSend);
      console.log(` ~[!] Request handled successfully! The request has been re-routed to ${targetType}!`);

   }  catch (error: any) {
      console.log(` ~[X] Error submitting the request to the queue: ${error.message}`);
      return;
   }
});

process.on('SIGINT', () => {
   console.log(' [*] Exiting...');
   closeConnection();
   process.exit(0);
});
