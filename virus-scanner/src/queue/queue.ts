import RabbitMQConnection from "../configuration/rabbitmq.config";
import {Connection, Channel, ConsumeMessage} from "amqplib";

// Define the structure of the task to submit to the entrypoint
export type TaskType = {
    data: any;
    time: String;
}

export async function startConsumer(queueName: string, processTask: (task: TaskType) => void) {
    const channel: Channel = await RabbitMQConnection.getChannel();
    channel.consume(queueName, (msg: ConsumeMessage | null) => {
        if (msg !== null) {
            const taskData: TaskType = JSON.parse(msg.content.toString());
            processTask(taskData);
            channel.ack(msg);
        }
    });
}

export async function addInQueue(exchangeName: string, type: string ,task: TaskType) {
    const channel: Channel = await RabbitMQConnection.getChannel();
    await channel.publish(exchangeName, type ,Buffer.from(JSON.stringify(task)));
}