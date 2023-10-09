# Use the official RabbitMQ image as the base image
FROM rabbitmq:3.12.6

# Copy custom RabbitMQ configuration files
COPY rabbitmq.conf /etc/rabbitmq/
COPY definitions.json /etc/rabbitmq/

# Enable RabbitMQ Management plugin
RUN rabbitmq-plugins enable rabbitmq_management
# Define the policy
RUN cd /etc/rabbitmq/conf.d/

# Expose the service ports
EXPOSE 5672 15672

# Start RabbitMQ server
CMD ["rabbitmq-server"]