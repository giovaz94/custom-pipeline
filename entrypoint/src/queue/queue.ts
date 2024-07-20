import RabbitMQConnection from "../configuration/rabbitmq.config";
import {ConfirmChannel} from "amqplib";
import * as prometheus from 'prom-client';

export type TaskType = {
    data: any;
    time: String;
}

export function addInQueue(
    exchangeName: string,
    type: string,
    task: TaskType,
) {
    RabbitMQConnection.getChannel().then((channel: ConfirmChannel) => {
        channel.publish(exchangeName, type ,Buffer.from(JSON.stringify(task)), undefined, (err, ok) => {
            if (err) {
                console.log(err);
            }
        });
    })
}

export async function closeConnection() {
    RabbitMQConnection.getChannel().then(channel => channel.close()).catch(err => console.log(err));
}