# Use the official RabbitMQ image as the base image
FROM rabbitmq:latest

# Copy custom RabbitMQ configuration files
COPY rabbitmq.conf /etc/rabbitmq/
COPY definitions.json /etc/rabbitmq/

# Enable RabbitMQ Management plugin
RUN rabbitmq-plugins enable rabbitmq_management
RUN cd /etc/rabbitmq/conf.d/
RUN echo management_agent.disable_metrics_collector = false > management_agent.disable_metrics_collector.conf

# Expose the service ports
EXPOSE 5672 15672

# Start RabbitMQ server
CMD ["rabbitmq-server"]