import requests
import time
import csv
from prometheus_api_client import PrometheusConnect
import threading
import datetime


class Logger:

    def __init__(self, prometheus_instance: PrometheusConnect, sleep: int = 1):
        self.prometheus_instance = prometheus_instance
        self.sleep = sleep
        self.csv_file = open('log.csv', 'a', newline='')
        self.csv_writer = csv.writer(self.csv_file)

    def _execute_prometheus_query(self, query: str):
        """
        Execute a query to the Prometheus server.
        """
        try:
            data = self.prometheus_instance.custom_query(query)
            # print(query)
            # print(data)
            return float(data[0]['value'][1])
        except (requests.exceptions.RequestException, KeyError, IndexError) as e:
            pass

    def log(self) -> None:
        """
        Log the current state of the system saving the metrics in a csv file.
        Metrics are collected from a Prometheus server.
        """
        print("Logging started")
        init_val = self._execute_prometheus_query("sum(http_requests_total_parser)")
        #init_val =  self._execute_prometheus_query("http_requests_total_parser")
        sl = self.sleep
        started = False
        while True:
            time.sleep(sl)
            message_loss = self._execute_prometheus_query("sum(services_message_lost)")
            tot = self._execute_prometheus_query("sum(http_requests_total_parser)")
            #tot = self._execute_prometheus_query("http_requests_total_parser")
            print("INBOUND: " + str((tot-init_val)))
            print("NOW: " + str(datetime.datetime.now()))            
            complete_message = self._execute_prometheus_query("sum(message_analyzer_complete_message)")
            number_of_instances_deployed = self._execute_prometheus_query("sum(kube_pod_status_phase{phase=~\"Running|Pending\", namespace=\"default\", app_kubernetes_io_name!=\"kube-state-metrics\"})")
            latency = self._execute_prometheus_query(
                "sum(rate(http_response_time_sum[10s])) / sum(rate(message_analyzer_complete_message[10s]))"
            )
            if tot - init_val > 0:
                init_val = tot
                sl = 10

if __name__ == "__main__":

    prometheus_service_address = "localhost"
    prometheus_service_port = 51385
    prometheus_url = f"http://{prometheus_service_address}:{prometheus_service_port}"
    logger = Logger(PrometheusConnect(url=prometheus_url))


    threading.Thread(target=logger.log).start()