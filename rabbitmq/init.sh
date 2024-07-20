#!/bin/bash
set -e

# Start RabbitMQ server in the background
rabbitmq-server -detached

# Wait for RabbitMQ to start up
sleep 10

# Set the queue length policy
rabbitmqctl set_policy --vhost pipeline-vhost queue-length "^.*\.queue$" '{"max-length":50}' --priority 0 --apply-to queues

# Bring RabbitMQ server to the foreground
rabbitmq-server
