FROM rabbitmq:latest

COPY rabbitmq.conf /etc/rabbitmq/
COPY definitions.json /etc/rabbitmq/
COPY init.sh /usr/local/bin/init.sh

USER root
RUN chown rabbitmq:rabbitmq /etc/rabbitmq/rabbitmq.conf /etc/rabbitmq/definitions.json
RUN chmod 644 /etc/rabbitmq/rabbitmq.conf /etc/rabbitmq/definitions.json
RUN chmod +x /usr/local/bin/init.sh
USER rabbitmq

RUN rabbitmq-plugins enable rabbitmq_management
RUN rabbitmq-plugins enable rabbitmq_prometheus

EXPOSE 5672 15672 15692

CMD ["init.sh"]
