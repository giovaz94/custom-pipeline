import RabbitMQConnection from "../configuration/rabbitmq.config";
import {ConsumeMessage, Channel} from "amqplib";

import * as prometheus from 'prom-client';

// Define the structure of the task to submit to the entrypoint
export type TaskType = {
    data: any;
    time: String
}

let queue: ConsumeMessage[] = [];
let pendingPromises: ((item: ConsumeMessage) => void)[] = [];

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
    RabbitMQConnection.getChannel().then((channel: Channel) => {
        channel.prefetch(1);
        channel.consume(queueName, async (msg: ConsumeMessage | null) => {
            if (msg !== null) {
                // channel.ack(msg);
                enqueue(msg);
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
        channel.publish(exchangeName, type, Buffer.from(JSON.stringify(task)), undefined);
    })
}


export async function closeConnection() {
    RabbitMQConnection.getChannel().then((channel: Channel) => channel.close());
}