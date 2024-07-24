import {enqueue, dequeue, TaskType, pendingPromises, queue} from "./queue/queue";
import express, { Application } from 'express';
import * as prometheus from 'prom-client';
import axios from "axios";

const interval = 1000/parseInt(process.env.MCL as string, 10);

const app: Application = express();
const port: string | 8001 = process.env.PORT || 8001;

app.use(express.json());

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


app.listen(port, () => {
   console.log(`Virus scanner service launched ad http://localhost:${port}`);
});


function sleep(ms: number) {
   return new Promise(resolve => setTimeout(resolve, ms));
}

app.post("/enqueue", async (req, res) => {
   const task: TaskType = req.body.task;
   const result = await enqueue(task);
   if (result) {
      res.status(200).send("Task added to the queue");
   } else {
      // TODO: increase lost messages counter
      res.status(500).send("Queue is full");
   }
});

async function loop() {
   console.log(' [*] Starting...');
   while(true) {
      const taskData: TaskType = await dequeue();
      await sleep(interval);
      const isVirus = false; //Math.floor(Math.random() * 4) === 0;
      const targetType = isVirus ? 'messageanalyzer.req' : 'attachmentman.req';
      if (isVirus) console.log(taskData.data + " has virus");
      else console.log(taskData.data+ ' is virus free');
      let metric = isVirus ? request_message_analyzer : requests_attachment_manager;
      metric.inc();
      axios.post('http://attachment-manager-service:8002/enqueue', {task: taskData});
      //addInQueue(exchangeName, targetType, taskData);
   }
}

process.on('SIGINT', async () => {
   console.log(' [*] Exiting...');
   while(pendingPromises.length > 0 || queue.length > 0) await sleep(5000);
   await sleep(5000);
   process.exit(0);
});

loop();