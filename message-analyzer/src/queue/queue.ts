import RabbitMQConnection from "../configuration/rabbitmq.config";
import {ConsumeMessage, Channel} from "amqplib";

export type TaskType = {
    data: any;
    time: String;}

export function startConsumer(queueName: string, processTask: (task: TaskType) => void) {
    RabbitMQConnection.getChannel().then((channel: Channel) => {
        channel.consume(queueName, (msg: ConsumeMessage | null) => {
            if (msg !== null) {
                const taskData: TaskType = JSON.parse(msg.content.toString());
                processTask(taskData);
                channel.ack(msg);
            }
        });
    });
}

export async function closeConnection() {
    RabbitMQConnection.getChannel().then(channel => channel.close());
}