#!/bin/bash
set -e

# Start RabbitMQ server in the background
rabbitmq-server -detached

# Wait for RabbitMQ to start up
echo "Waiting for RabbitMQ to be ready..."
until rabbitmqctl status >/dev/null 2>&1; do
    sleep 1
done

# Set the queue length policy
rabbitmqctl set_policy --vhost pipeline-vhost queue-length "^.*\.queue$" '{"max-length":50}' --priority 0 --apply-to queues

echo "RabbitMQ policy set successfully."

# Bring RabbitMQ server to the foreground
rabbitmq-server

