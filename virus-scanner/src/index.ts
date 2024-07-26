import {addInQueue, cancelConnection, closeConnection, dequeue, startConsumer, TaskType, pendingPromises, queue} from "./queue/queue";
import express, { Application } from 'express';
import * as prometheus from 'prom-client';
import {ConsumeMessage} from "amqplib";

const queueName = process.env.QUEUE_NAME || 'virusscan.queue';
const interval = 800/parseInt(process.env.MCL as string, 10);
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';

const app: Application = express();
const port: string | 8001 = process.env.PORT || 8001;



const request_message_analyzer = new prometheus.Counter({
   name: 'http_requests_total_message_analyzer_counter',
   help: 'Total number of HTTP requests',
});

const requests_attachment_manager = new prometheus.Counter({
   name: 'http_requests_total_attachment_manager_counter',
   help: 'Total number of HTTP requests',
});

app.get('/metrics', (req, res) => {
   prometheus.register.metrics()
       .then(metrics => {
          res.set('Content-Type', prometheus.contentType);
          res.end(metrics);
       })
       .catch(error => {
          console.error("Error:", error);
          res.status(500).end("Internal Server Error");
       });
});


function sleep(ms: number) {
   return new Promise(resolve => setTimeout(resolve, ms));
}

startConsumer(queueName, async (channel) => {
   while(true){
      const msg: ConsumeMessage = await dequeue();
      await sleep(interval);
      channel.ack(msg);
      const taskData: TaskType = JSON.parse(msg.content.toString());
      const isVirus = false;//Math.floor(Math.random() * 4) === 0;
      const targetType = isVirus ? 'messageanalyzer.req' : 'attachmentman.req';
      if (isVirus) console.log(taskData.data + " has virus");
      else console.log(taskData.data+ ' is virus free');
      let metric = isVirus ? request_message_analyzer : requests_attachment_manager;
      metric.inc();
      addInQueue(exchangeName, targetType, taskData);
   }
});

app.listen(port, () => {
   console.log(`Virus scanner service launched ad http://localhost:${port}`);
});


process.on('SIGINT', async () => {
   console.log(' [*] Exiting...');
   cancelConnection();
   while(pendingPromises.length > 0 || queue.length > 0) await sleep(5000);
   await sleep(5000);
   await closeConnection();
   process.exit(0);
});
