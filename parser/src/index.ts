import express, { Express, Request, Response , Application } from 'express';
import * as amqp from 'amqplib';

const app: Application = express();
const port: string | 8000 = process.env.PORT || 8000;
const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://pipeline_broker:p1p3l1n3@localhost/pipeline-vhost';

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

app.post('/parse', async (req: Request, res: Response) => {
    try {
        const connection = await amqp.connect(rabbitmqUrl);
        const channel = await connection.createChannel();

        const queueName = 'demo-queue';

        // Assert the queue in the specified virtual host
        await channel.assertQueue(queueName, { durable: true, arguments: { 'x-queue-mode': 'lazy' }});

        // Publish a message to the queue
        const message = 'Hello, RabbitMQ!';
        channel.sendToQueue(queueName, Buffer.from(message));
        console.log(`Message sent: ${message}`);

        // Consume messages from the queue
        channel.consume(queueName, (msg) => {
            if (msg !== null) {
                console.log(`Received message: ${msg.content.toString()}`);
                // You can process the message here
                channel.ack(msg); // Acknowledge the message

                return res.status(200).send(msg.content.toString());
            }
        });

    } catch (error) {
        console.error('Error:', error);
    }
});



app.use(express.json());
app.listen(port, () => {
    console.log(`Message parser launched at http://localhost:${port}`);
});


