import RabbitMQConnection from "../configuration/rabbitmq.config";
import {ConsumeMessage, Channel, Replies} from "amqplib";

const inputQueueName = process.env.INPUT_QUEUE_NAME || 'imageanalyzer.queue';
const outputQueueName = process.env.OUTPUT_QUEUE_NAME || 'imageanalyzer.out.queue';

// Define the structure of the task to submit to the entrypoint
export type TaskType = {
    data: any;
    time: String
}
var consume: Replies.Consume;
const prefetch = parseInt(process.env.PREFETCH as string, 10);
export let input_queue: ConsumeMessage[] = [];
export let input_pendingPromises: ((item: ConsumeMessage) => void)[] = [];

export let output_queue: ConsumeMessage[] = [];
export let output_pendingPromises: ((item: ConsumeMessage) => void)[] = [];

export let ackQueue: ConsumeMessage[] = [];
export async function ackEnqueue(inputMsg: ConsumeMessage): Promise<void>{
    console.log("adding to ackQueue")
    console.log(ackQueue.length)
    ackQueue.push(inputMsg);
    if (ackQueue.length >= prefetch) {
        console.log("acking all messages")
        let channel = await RabbitMQConnection.getChannel();
        await Promise.all(ackQueue.map(msg => channel.ack(msg)));
        ackQueue = [];
    }
}


async function input_enqueue(item: ConsumeMessage): Promise<void> {
    if (input_pendingPromises.length > 0) {
        const resolve = input_pendingPromises.shift();
        resolve!(item);
    } else {
        input_queue.push(item);
    }
}

export async function input_dequeue(): Promise<ConsumeMessage> {
    let toReturn;
    if (input_queue.length > 0) {
        toReturn = input_queue.shift()!;
    } else {
        toReturn = new Promise<ConsumeMessage>((resolve) => input_pendingPromises.push(resolve));
    }
    return toReturn;
}

async function output_enqueue(item: ConsumeMessage): Promise<void> {
    if (output_pendingPromises.length > 0) {
        const resolve = output_pendingPromises.shift();
        resolve!(item);
    } else {
        output_queue.push(item);
    }
}

export async function output_dequeue(): Promise<ConsumeMessage> {
    if (output_queue.length > 0) {
        return output_queue.shift()!;
    } else {
        return new Promise<ConsumeMessage>((resolve) => output_pendingPromises.push(resolve));
    }
}
export function startInputConsumer(queueName: string, processTask: (channel: Channel) => void) {
    RabbitMQConnection.getChannel().then(async (channel: Channel) => {
        channel.prefetch(prefetch);
        consume = await channel.consume(queueName, async (msg: ConsumeMessage | null) => {
            if (msg !== null) input_enqueue(msg);
        });
        processTask(channel);
    });
}

export function startOutputConsumer(queueName: string, processTask: (channel: Channel) => void) {
    RabbitMQConnection.getChannel().then(async (channel: Channel) => {
        channel.consume(queueName, async (msg: ConsumeMessage | null) => {
            if (msg !== null) output_enqueue(msg);
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
        channel.publish(exchangeName, type, Buffer.from(JSON.stringify(task)), { expiration: '5000' });
    })
}

export async function cancelConnection() {
    (channel: Channel) => channel.cancel(consume.consumerTag);
}

export async function closeConnection() {
    RabbitMQConnection.getChannel().then(
        (channel: Channel) => channel.close()
    );
}