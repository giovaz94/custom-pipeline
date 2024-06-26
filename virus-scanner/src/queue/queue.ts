import RabbitMQConnection from "../configuration/rabbitmq.config";
import { ConsumeMessage, ConfirmChannel} from "amqplib";
import * as prometheus from 'prom-client';

// Define the structure of the task to submit to the entrypoint
export type TaskType = {
    att_number: number;
    data: any;
    time: String;
}

export function startConsumer(queueName: string, processTask: (task: TaskType) => void) {
    RabbitMQConnection.getChannel().then((channel: ConfirmChannel) => {
        channel.consume(queueName, (msg: ConsumeMessage | null) => {
            if (msg !== null) {
                const taskData: TaskType = JSON.parse(msg.content.toString());
                processTask(taskData);
                channel.ack(msg);
            }
        });
    });
}

export function addInQueue(exchangeName: string, type: string ,task: TaskType, messageLossCounter: prometheus.Counter) {
    RabbitMQConnection.getChannel().then((channel: ConfirmChannel) => {
        channel.publish(exchangeName, type ,Buffer.from(JSON.stringify(task)), undefined, (err, ok) => {
            console.log(err);
            console.log(ok);
            if (err) {
                console.log(exchangeName);
                console.log(type);
                console.log(err);
                messageLossCounter.inc();
            }
        });
    })
}
export async function closeConnection() {
    RabbitMQConnection.getChannel().then((channel: ConfirmChannel) => channel.close());
}