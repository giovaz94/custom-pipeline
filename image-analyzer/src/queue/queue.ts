import RabbitMQConnection from "../configuration/rabbitmq.config";
import {ConsumeMessage, Channel} from "amqplib";

const inputQueueName = process.env.INPUT_QUEUE_NAME || 'imageanalyzer.queue';
const outputQueueName = process.env.OUTPUT_QUEUE_NAME || 'imageanalyzer.out.queue';

// Define the structure of the task to submit to the entrypoint
export type TaskType = {
    data: any;
    time: String
}

export let input_queue: ConsumeMessage[] = [];
export let input_pendingPromises: ((item: ConsumeMessage) => void)[] = [];

export let output_queue: ConsumeMessage[] = [];
export let output_pendingPromises: ((item: ConsumeMessage) => void)[] = [];

async function input_enqueue(item: ConsumeMessage): Promise<void> {
    if (input_pendingPromises.length > 0) {
        const resolve = input_pendingPromises.shift();
        resolve!(item);
    } else {
        input_queue.push(item);
    }
}

export async function input_dequeue(): Promise<ConsumeMessage> {
    if (input_queue.length > 0) {
        return input_queue.shift()!;
    } else {
        return new Promise<ConsumeMessage>((resolve) => input_pendingPromises.push(resolve));
    }
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

export function startConsumer(queueName: string, processTask: (channel: Channel) => void) {
    RabbitMQConnection.getChannel().then((channel: Channel) => {
        channel.prefetch(50);
        channel.consume(queueName, async (msg: ConsumeMessage | null) => {
            if (msg !== null) {
                // channel.ack(msg);
                if (queueName == inputQueueName) input_enqueue(msg);
                if (queueName == outputQueueName) output_enqueue(msg);
            }
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
    RabbitMQConnection.getChannel().then((channel: Channel) => channel.close());
}