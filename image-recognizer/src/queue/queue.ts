import RabbitMQConnection from "../configuration/rabbitmq.config";
import {Connection, Channel, ConsumeMessage, ConfirmChannel} from "amqplib";
import axios from "axios";
import RequestCounter from "../req-counter/req.counter";
const dbUrl = process.env.DB_URL || 'http://localhost:3200';

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
    RequestCounter.getInstance().increase();
    channel.publish(exchangeName, type ,Buffer.from(JSON.stringify(task)), undefined, async (err, ok) => {
        if (err) {
            const lossResponse = await axios.post(dbUrl + "/messageLoss", {id: task.data.id});
            console.log(` ~[X] Error submitting the request to the queue, message loss: ${lossResponse.data.message}`);
        }
    });
}

export async function closeConnection() {
    const channel:ConfirmChannel  = await RabbitMQConnection.getChannel();
    await channel.close();
}