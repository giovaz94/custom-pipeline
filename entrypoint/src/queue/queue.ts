import RabbitMQConnection from "../configuration/rabbitmq.config";
import {ConfirmChannel} from "amqplib";

// Define the structure of the task to submit to the entrypoint
export type TaskType = {
    data: any;
    time: String;
}

export async function addInQueue(exchangeName: string, type: string ,task: TaskType) {
    RabbitMQConnection.getChannel().then((channel: ConfirmChannel) => {
        channel.publish(exchangeName, type, Buffer.from(JSON.stringify(task)), undefined, (err, ok) => {
            if (err) {
                throw new Error(`Error submitting the request to the queue: ${err.message}`);
            }
        });
    });
}

export async function closeConnection() {
    RabbitMQConnection.getChannel().then(channel => channel.close());
}