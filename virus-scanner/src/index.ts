import {addInQueue, closeConnection, startConsumer} from "./queue/queue";
import express, { Application } from 'express';
import * as prometheus from 'prom-client';

const queueName = process.env.QUEUE_NAME || 'virusscan.queue';
const interval = 1000/parseInt(process.env.MCL as string, 10);
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';


const app: Application = express();
const port: string | 8001 = process.env.PORT || 8001;

const requests = new prometheus.Counter({
   name: 'http_requests_total_virus_scanner',
   help: 'Total number of HTTP requests',
});

const requestsTotalTime = new prometheus.Counter({
   name: 'http_response_time_sum',
   help: 'Response time sum'
})

const messageLost = new prometheus.Counter({
   name: 'services_message_lost',
   help: 'Number of messages lost'
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


app.listen(port, () => {
   console.log(`Virus scanner service launched ad http://localhost:${port}`);
});


function sleep(ms: number) {
   return new Promise(resolve => setTimeout(resolve, ms));
}

startConsumer(queueName, (task) => {
   const dateStart = new Date();
   sleep(interval).then(() => {
      const id = task.data;
      requests.inc();
      const isVirus = Math.floor(Math.random() * 4) === 0;
      const targetType = isVirus ? 'messageanalyzer.req' : 'attachmentman.req';
      const data = isVirus ? {id: task.data, isVirus: true} : task.data;
      const taskToSend = {
         data: data,
         time: new Date().toISOString(),
         att_number: task.att_number
      }
      addInQueue(exchangeName, targetType, taskToSend, messageLost);
   }).finally(() => {
      const dateEnd = new Date();
      const timeDifference = dateEnd.getTime() - dateStart.getTime();
      requestsTotalTime.inc(timeDifference);
   });
});

process.on('SIGINT', () => {
   console.log(' [*] Exiting...');
   closeConnection();
   process.exit(0);
});
