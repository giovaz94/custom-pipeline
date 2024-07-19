import RabbitMQConnection from "../configuration/rabbitmq.config";
import {ConsumeMessage, Channel, Replies} from "amqplib";

import * as prometheus from 'prom-client';
import Consume = Replies.Consume;

// Define the structure of the task to submit to the entrypoint
export type TaskType = {
    data: any;
    time: String;
}

export let queue: ConsumeMessage[] = [];
export let pendingPromises: ((item: ConsumeMessage) => void)[] = [];

var consume: Consume;

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
        // channel.prefetch(50);
        consume = await channel.consume(queueName, async (msg: ConsumeMessage | null) => {
            console.log("New message received");
            if (msg !== null) {
                channel.ack(msg);
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
        channel.publish(exchangeName, type, Buffer.from(JSON.stringify(task)), {expiration: 3000});
    })
}


export async function closeConnection() {
    RabbitMQConnection.getChannel().then(
        (channel: Channel) => channel.cancel(consume.consumerTag)
    );
}