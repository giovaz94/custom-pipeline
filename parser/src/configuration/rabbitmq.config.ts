import amqp, { Connection } from 'amqplib';
const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://pipeline_broker:p1p3l1n3@localhost/pipeline-vhost';

export default class RabbitMQConnection {
    private static instance: Connection;
    private constructor() {}

    static async getInstance(): Promise<Connection> {
        if (!this.instance) {
            this.instance =  await amqp.connect(rabbitmqUrl);
        }
        return this.instance;
    }
}
