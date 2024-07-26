import RabbitMQConnection from "../configuration/rabbitmq.config";
import {ConsumeMessage, Channel, Replies} from "amqplib";

import * as prometheus from 'prom-client';
// Define the structure of the task to submit to the entrypoint
export type TaskType = {
    data: any;
    time: String;
}

export let queue: ConsumeMessage[] = [];
export let pendingPromises: ((item: ConsumeMessage) => void)[] = [];

var consume: Replies.Consume;
const prefetch = parseInt(process.env.PREFETCH as string, 10);

const queueMaxLen =  parseInt(process.env.QUEUE_MAX_LEN as string, 10) || 200;

function getOccupationPercentage(): number {
    return queue.length / queueMaxLen;
}

async function enqueue(item: ConsumeMessage): Promise<void> {
    if (pendingPromises.length > 0) {
        const resolve = pendingPromises.shift();
        resolve!(item);
    } else {
        queue.push(item);
    }

    if (queueMaxLen == queue.length) {
        RabbitMQConnection.getChannel().then(async (channel: Channel) => {
            await channel.prefetch(1);
        });
    }
}

export async function dequeue(): Promise<ConsumeMessage> {
    let toReturn;
    if (queue.length > 0) {
      toReturn = queue.shift()!;
    } else {
      toReturn = new Promise<ConsumeMessage>((resolve) => pendingPromises.push(resolve));
    }
    if (getOccupationPercentage() < 0.75) {
        RabbitMQConnection.getChannel().then(async (channel: Channel) => {
            await channel.prefetch(prefetch);
        });
    }
    return toReturn;
}

export function startConsumer(queueName: string, processTask: (channel: Channel) => void) {
    RabbitMQConnection.getChannel().then(async (channel: Channel) => {
        channel.prefetch(prefetch);
        consume = await channel.consume(queueName, async (msg: ConsumeMessage | null) => {
            if (msg !== null) await enqueue(msg);
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
        channel.publish(exchangeName, type, Buffer.from(JSON.stringify(task)),{ expiration: '5000' });
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