import RabbitMQConnection from "../configuration/rabbitmq.config";
import {ConsumeMessage, Channel} from "amqplib";

import * as prometheus from 'prom-client';

// Define the structure of the task to submit to the entrypoint
export type TaskType = {
    data: any;
    time: String
}

export function startConsumer(queueName: string, processTask: (channel: Channel, task: ConsumeMessage) => void) {
    RabbitMQConnection.getChannel().then((channel: Channel) => {
        channel.prefetch(1);
        channel.consume(queueName, async (msg: ConsumeMessage | null) => {
            if (msg !== null) processTask(channel, msg)
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