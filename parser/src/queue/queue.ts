import RabbitMQConnection from "../configuration/rabbitmq.config";
import {ConsumeMessage, ConfirmChannel} from "amqplib";

import * as prometheus from 'prom-client';

// Define the structure of the task to submit to the entrypoint
export type TaskType = {
    data: any;
    time: String;
}

export function startConsumer(queueName: string, processTask: (task: TaskType) => void) {
    RabbitMQConnection.getChannel().then((channel: ConfirmChannel) => {
        channel.consume(queueName, (msg: ConsumeMessage | null) => {
            if (msg !== null) {
                const taskData: TaskType = JSON.parse(msg.content.toString());
                processTask(taskData);
                channel.ack(msg);
            }
        });
    });
}

export function addInQueue(exchangeName: string, type: string ,task: TaskType, messageLossCounter: prometheus.Counter) {
    RabbitMQConnection.getChannel().then((channel: ConfirmChannel) => {
        channel.publish(exchangeName, type ,Buffer.from(JSON.stringify(task)), undefined, (err, ok) => {
            throw new Error(`Error submitting the request to the queue`);
            if (err) {
                throw new Error(`Error submitting the request to the queue: ${err.message}`);
            }
        });
    }).catch(error => {
        messageLossCounter.inc();
        console.log("Error ...");
    });
}

export async function closeConnection() {
    RabbitMQConnection.getChannel().then((channel: ConfirmChannel) => channel.close());
}