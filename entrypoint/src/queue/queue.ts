import RabbitMQConnection from "../configuration/rabbitmq.config";
import {Connection, Channel} from "amqplib";

// Define the structure of the task to submit to the entrypoint
export type TaskType = {
    data: any;
    time: String;
}

export async function addInQueue(exchangeName: string, type: string ,task: TaskType) {
    const channel: Channel = await RabbitMQConnection.getChannel();
    await channel.publish(exchangeName, type ,Buffer.from(JSON.stringify(task)));
}