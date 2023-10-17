import RabbitMQConnection from "../configuration/rabbitmq.config";
import {Connection, Channel, ConsumeMessage, ConfirmChannel} from "amqplib";

// Define the structure of the task to submit to the entrypoint
export type TaskType = {
    data: any;
    time: String;
}

export async function startConsumer(queueName: string, processTask: (task: TaskType) => void) {
    const channel: ConfirmChannel = await RabbitMQConnection.getChannel();
    channel.consume(queueName, (msg: ConsumeMessage | null) => {
        if (msg !== null) {
            const taskData: TaskType = JSON.parse(msg.content.toString());
            processTask(taskData);
            channel.ack(msg);
        }
    });
}

export async function addInQueue(exchangeName: string, type: string ,task: TaskType) {
    const channel: ConfirmChannel = await RabbitMQConnection.getChannel();
    channel.publish(exchangeName, type ,Buffer.from(JSON.stringify(task)), undefined, (err, ok) => {
        if (err) {
            throw new Error(`Error submitting the request to the queue: ${err.message}`);
        }
    });
}