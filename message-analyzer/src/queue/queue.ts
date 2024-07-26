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
const prefetch = parseInt(process.env.PREFETCH as string, 10);
export let ackQueue: ConsumeMessage[] = [];
export async function ackEnqueue(inputMsg: ConsumeMessage): Promise<void>{
    if(ackQueue.length < prefetch) {
        ackQueue.push(inputMsg);
    }
    else {
        console.log("acking all messages")
        let channel = await RabbitMQConnection.getChannel();
        ackQueue.forEach((msg) => {
            channel.ack(msg);
        });
        ackQueue = [];
    }
}

async function enqueue(item: ConsumeMessage): Promise<void> {
    if (pendingPromises.length > 0) {
        const resolve = pendingPromises.shift();
        resolve!(item);
    } else {
        queue.push(item);
    }
}

export async function dequeue(): Promise<ConsumeMessage> {
    let toReturn;
    if (queue.length > 0) {
        toReturn = queue.shift()!;
    } else {
        toReturn = new Promise<ConsumeMessage>((resolve) => pendingPromises.push(resolve));
    }
    return toReturn;
}

export function startConsumer(queueName: string, processTask: (channel: Channel) => void) {
    RabbitMQConnection.getChannel().then(async (channel: Channel) => {
        channel.prefetch(prefetch);
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
    RabbitMQConnection.getChannel().then(async (channel: Channel) => {
        const isPub = channel.publish(exchangeName, type, Buffer.from(JSON.stringify(task)), { expiration: '5000' });
        if (!isPub) console.log("REJECTED");
    })
}

export async function cancelConnection() {
    RabbitMQConnection.getChannel().then(
        (channel: Channel) => channel.cancel(consume.consumerTag)
    );
}

export async function closeConnection() {
    RabbitMQConnection.getChannel().then(
        (channel: Channel) => channel.close()
    );
}