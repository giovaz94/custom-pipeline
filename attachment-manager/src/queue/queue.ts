import RabbitMQConnection from "../configuration/rabbitmq.config";
import {ConsumeMessage, Channel, Replies} from "amqplib";

// Define the structure of the task to submit to the entrypoint
export type TaskType = {
    data: any;
    time: String
}

export let queue: ConsumeMessage[] = [];
export let pendingPromises: ((item: ConsumeMessage) => void)[] = [];

var consume: Replies.Consume;

async function enqueue(item: ConsumeMessage): Promise<void> {
    if (pendingPromises.length > 0) {
        const resolve = pendingPromises.shift();
        resolve!(item);
    } else {
        queue.push(item);
    }
}

export async function dequeue(): Promise<ConsumeMessage> {
    if (queue.length > 0) {
        return queue.shift()!;
    } else {
        return new Promise<ConsumeMessage>((resolve) => pendingPromises.push(resolve));
    }
}

export function startConsumer(queueName: string, processTask: (channel: Channel) => void) {
    RabbitMQConnection.getChannel().then(async (channel: Channel) => {
        //channel.prefetch(50);
        consume = await channel.consume(queueName, async (msg: ConsumeMessage | null) => {
            if (msg !== null) enqueue(msg);
        });
        processTask(channel);
    });
}

export function addInQueue(
    exchangeName: string,
    type: string,
    task: TaskType
) {
    RabbitMQConnection.getChannel().then((channel: Channel) => {
        channel.publish(exchangeName, type, Buffer.from(JSON.stringify(task)));
    })
}


export async function closeConnection() {
    RabbitMQConnection.getChannel().then((channel: Channel) => channel.cancel(consume.consumerTag));
}