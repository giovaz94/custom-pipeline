import RabbitMQConnection from "../configuration/rabbitmq.config";
import {Connection} from "amqplib";

// Define the structure of the task to submit to the queue
export type TaskType = {
    data: any;
    time: String;
}

export async function addInQueue(queueName: string, task: TaskType) {
    const connection: Connection = await RabbitMQConnection.getInstance();
    const channel = await connection.createChannel();

    await channel.assertQueue(queueName);
    await channel.sendToQueue(queueName, Buffer.from(JSON.stringify(task)));
}


export async function startConsumer(queueName: string, processTask: (task: TaskType) => void) {
    const connection: Connection = await RabbitMQConnection.getInstance();
    const channel = await connection.createChannel();

    await channel.assertQueue(queueName);
    channel.consume(queueName, (msg) => {
        if (msg !== null) {
            const taskData: TaskType = JSON.parse(msg.content.toString());
            processTask(taskData);
            channel.ack(msg);
        }
    });
}