import {enqueue, dequeue, TaskType, pendingPromises, queue} from "./queue/queue";
import express, { Application } from 'express';
import * as prometheus from 'prom-client';
import axios from "axios";

const interval = 850/parseInt(process.env.MCL as string, 10);

const app: Application = express();
const port: string | 8001 = process.env.PORT || 8001;

app.use(express.json());


const vs_requests = new prometheus.Counter({
   name: 'http_requests_total_virus_scanner_counter',
   help: 'Total number of HTTP requests',
});

const lost_messages = new prometheus.Counter({
   name: 'lost_messages',
   help: 'Total number of lost messages',
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
   vs_requests.inc();
   const task: TaskType = req.body.task;
   const result = await enqueue(task);
   if (result) {
      res.status(200).send("Task added to the queue");
   } else {
      lost_messages.inc();
      res.status(500).send("Queue is full");
   }
});

async function loop() {
   console.log(' [*] Starting...');
   while(true) {
      const taskData: TaskType = await dequeue();
      await sleep(interval);
      const isVirus = Math.floor(Math.random() * 4) === 0;
      if (isVirus) console.log(taskData.data + " has virus");
      else console.log(taskData.data+ ' is virus free');
      if(isVirus) {
         axios.post('http://message-analyzer-service:8006/enqueue', {task: taskData});
      } else {
         axios.post('http://attachment-manager-service:8002/enqueue', {task: taskData});
      }
   }
}

process.on('SIGINT', async () => {
   console.log(' [*] Exiting...');
   while(pendingPromises.length > 0 || queue.length > 0) await sleep(5000);
   await sleep(5000);
   process.exit(0);
});

loop();