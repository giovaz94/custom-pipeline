# How to start the rabbitmq service

Build the image with the following command:
```bash
$ docker build -t rabbitmq-service .
```

Then start the container:
```bash
$ docker run -d --hostname my-rabbit --name rabbitmq-service -p 5672:5672 -p 15672:15672 rabbitmq-service
```
It's possible to access the management console at http://localhost:15672 with the 
credentials:

- username: pipeline_broker
- password: p1p3l1ne.

Adjust the credentials in the `rabbitmq.conf` and `definitions.json` files if needed.
