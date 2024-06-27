import RabbitMQConnection from "../configuration/rabbitmq.config";
import {Channel} from "amqplib";
import * as prometheus from 'prom-client';

// Define the structure of the task to submit to the entrypoint
export type TaskType = {
    data: any;
    time: String;
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
    RabbitMQConnection.getChannel().then(channel => channel.close());
}