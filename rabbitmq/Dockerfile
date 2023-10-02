# Use the official RabbitMQ image as the base image
FROM rabbitmq:latest

RUN rabbitmq-plugins enable rabbitmq_management

# Copy custom RabbitMQ configuration files
COPY rabbitmq.conf /etc/rabbitmq/
COPY definitions.json /etc/rabbitmq/

# Expose the service ports
EXPOSE 5672 15672

# Start RabbitMQ server
CMD ["rabbitmq-server"]