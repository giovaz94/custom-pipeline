import amqp, {Channel, Connection} from 'amqplib';

export default class RabbitMQConnection {
    private static instance: Connection;
    private static channel: Channel;
    private constructor() {}

    static async getInstance(): Promise<RabbitMQConnection> {

        try {
            this.instance =  await amqp.connect({
                hostname: process.env.HOSTNAME || 'localhost',
                port: 5672,
                username: process.env.RABBITMQ_USERNAME || 'pipeline_broker',
                password: process.env.RABBITMQ_PASSWORD || 'p1p3l1n3',
                vhost: process.env.RABBITMQ_VHOST || 'pipeline-vhost'
            });
        } catch (error: any) {
            console.error('Error connecting to RabbitMQ server:', error.message);
            setTimeout(this.getInstance, 5000);
        }

        if (!this.channel) {
            this.channel = await this.instance.createChannel();
        }
        return this;
    }

    static async getChannel(): Promise<Channel> {
        if (!this.instance) {
            await this.getInstance();
        }
        return this.channel;
    }

    static async close(): Promise<void> {
        if (this.instance) {
            await this.instance.close();
        }
    }
}
