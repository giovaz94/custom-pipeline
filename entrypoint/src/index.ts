import express, {Request, Response , Application } from 'express';
import * as prometheus from 'prom-client';
import * as http from "http";
import Redis from 'ioredis';

const app: Application = express();
const port: string | 8010 = process.env.PORT || 8010;
const publisher = new Redis({
    host:  process.env.REDIS_HOST || 'redis',
    port: 6379,
});
const workload = [
    // 600,600,600,600,600,600,600,600,600,600,
    // 600,600,600,600,600,600,600,600,600,600,
    // 600,600,600,600,600,600,600,600,600,600,
    // 600,600,600,600,600,600,600,600,600,600,
    // 600,600,600,600,600,600,600,600,600,600,
    // 600,600,600,600,600,600,600,600,600,600,
    // 600,600,600,600,600,600,600,600,600,600,
    // 600,600,600,600,600,600,600,600,600,600,
    // 600,600,600,600,600,600,600,600,600,600,
    // 600,600,600,600,600,600,600,600,600,600,
    // 600,600,600,600,600,600,600,600,600,600,
    // 600,600,600,600,600,600,600,600,600,600,
    // 600,600,600,600,600,600,600,600,600,600,
    // 600,600,600,600,600,600,600,600,600,600,
    // 600,600,600,600,600,600,600,600,600,600,
    // 600,600,600,600,600,600,600,600,600,600,
    // 600,600,600,600,600,600,600,600,600,600,
    // 600,600,600,600,600,600,600,600,600,600,
    // 600,600,600,600,600,600,600,600,600,600,
    // 600,600,600,600,600,600,600,600,600,600,
    // 600,600,600,600,600,600,600,600,600,600
    10, 5, 2, 2, 25, 22, 17, 20, 22, 27,
    7, 17, 12, 50, 52, 30, 22, 17, 90, 120,
    40, 37, 35, 80, 75, 15, 165, 535, 497, 507,
    522, 507, 510, 557, 610, 617, 610, 675, 665, 640,
    635, 612, 602, 597, 57, 585, 560, 555, 597, 590,
    590, 590, 582, 542, 535, 557, 565, 587, 672, 710,
    715, 750, 760, 750, 755, 747, 725, 747, 737, 730,
    722, 732, 725, 727, 720, 725, 722, 745, 740, 735,
    682, 690, 650, 635, 625, 590, 550, 510, 515, 532,
    552, 545, 520, 507, 505, 502, 515, 510, 512, 510,
    500, 505, 505, 432, 425, 425, 422, 395, 392, 395,
    405, 392, 397, 377, 367, 327, 322, 312, 310, 340,
    320, 315, 320, 312, 305, 600, 297, 275, 280, 287,
    290, 287, 297, 310, 307, 305, 302, 312, 600, 297,
    297, 305, 312, 310, 322, 315, 312, 312, 275, 267,
    260, 260, 257, 250, 245, 230, 210, 227, 250, 247,
    232, 230, 217, 210, 600, 192, 187, 167, 152, 167,
    150, 137, 127, 65, 62, 55, 52, 50, 50, 50,
    45, 132, 130, 47, 92, 95, 150, 157, 255, 400,
    430, 440, 440, 445, 455, 475, 457, 447, 447, 420
];



app.use(express.json());

const REFRESH_TIME = parseInt(process.env.REFRESH_TIME as string, 10) || 10000;

const parser_requests = new prometheus.Counter({
    name: 'http_requests_total_parser',
    help: 'Total number of HTTP requests',
});

var stop = false;

http.globalAgent.maxSockets = Infinity;

async function publishMessage(streamName: string, message: Record<string, string>): Promise<void> {
    await publisher.xadd(streamName, '*', ...Object.entries(message).flat());
}

app.use((req, res, next) => {
    res.setTimeout(231000); // 2 minutes
    next();
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

app.post('/', (req: Request, res: Response) => {
    parser_requests.inc();
    publishMessage('parser-stream', { data: req.body.id}).catch(console.error);
    return res.status(201).send("Request correctly submitted to the entrypoint!");
});


app.post('/start', (req: Request, res: Response) => {
    stop = false;
    var index = 0;
    (async () => {
        while(index < workload.length && !stop) {
            const r = workload[index++];
            console.log(`Sending ${r} requests per second`);
            for (let i = 0; i < r; i++) {
                publishMessage('parser-stream', { data: req.body.id}).catch(console.error);
                parser_requests.inc();
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    })();
    return res.status(201).send("Start simulation...");
});

app.post('/stop', (req: Request, res: Response) => {
    stop = true;
    return res.status(201).send("Stop simulation...");
})

const server = app.listen(port, () => {
    console.log(`Entrypoint launhed ad http://localhost:${port}`);
    console.log(`Refresh time: ${REFRESH_TIME * 0.001}s`);
});

server.keepAliveTimeout = 60000; // 60 seconds;

