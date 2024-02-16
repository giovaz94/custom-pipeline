import {addInQueue, closeConnection, startConsumer} from "./queue/queue";
import express, {Request, Response , Application } from 'express';
import RequestCounter from "./req-counter/req.counter";

const queueName = process.env.QUEUE_NAME || 'virusscan.queue';
const interval = 1000/parseInt(process.env.MCL as string, 10);
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';

let requestCounter = 0;
let lastRequestTime = new Date().getTime();

const app: Application = express();
const port: string | 8001 = process.env.PORT || 8001;

app.listen(port, () => {
   console.log(`Message parser service launched ad http://localhost:${port}`);
});

app.get('/inbound-workload', async (req: Request, res: Response) => {
   const now = new Date().getTime();
   const secondsElapsed = (now - lastRequestTime) / 1000;
   const inboundWorkload = RequestCounter.getInstance().getCount() / secondsElapsed;

   lastRequestTime = new Date().getTime();
   RequestCounter.getInstance().reset();
   return res.status(200).send({
      inboundWorkload: inboundWorkload
   });
});

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
