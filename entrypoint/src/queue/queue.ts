import RabbitMQConnection from "../configuration/rabbitmq.config";
import {Channel} from "amqplib";
import * as prometheus from 'prom-client';

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
        channel.publish(exchangeName, type ,Buffer.from(JSON.stringify(task)), {expiration: 3000});
    })
}

export async function closeConnection() {
    RabbitMQConnection.getChannel().then(channel => channel.close()).catch(err => console.log(err));
}