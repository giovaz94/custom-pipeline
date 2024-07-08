import RabbitMQConnection from "../configuration/rabbitmq.config";
import {ConsumeMessage, Channel} from "amqplib";

import * as prometheus from 'prom-client';

// Define the structure of the task to submit to the entrypoint
export type TaskType = {
    data: any;
    time: String
}

export function startConsumer(queueName: string, processTask: (task: TaskType) => void) {
    RabbitMQConnection.getChannel().then((channel: Channel) => {
        channel.consume(queueName, async (msg: ConsumeMessage | null) => {
            if (msg !== null) {
                const taskData: TaskType = JSON.parse(msg.content.toString());
                processTask(taskData)
                channel.ack(msg)
            }
        });
    });
}

export function addInQueue(
    exchangeName: string,
    type: string,
    task: TaskType
) {
    RabbitMQConnection.getChannel().then((channel: Channel) => {
        channel.publish(exchangeName, type ,Buffer.from(JSON.stringify(task)), undefined);
    })
}


export async function closeConnection() {
    RabbitMQConnection.getChannel().then((channel: Channel) => channel.close());
}