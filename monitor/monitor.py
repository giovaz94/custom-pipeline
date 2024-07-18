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
        init_val_completed = self._execute_prometheus_query("sum(last_over_time(message_analyzer_complete_message[20s]))")
        init_val_latency = self._execute_prometheus_query("sum(last_over_time(http_response_time_sum[20s]))")
        sl = self.sleep
        started = False
        time_difference_ms = 0
        while True:
            start = time.time()
            tot = self._execute_prometheus_query("sum(http_requests_total_parser)")
            completed = self._execute_prometheus_query("sum(last_over_time(message_analyzer_complete_message[10s]))")
            latency = self._execute_prometheus_query("sum(last_over_time(http_response_time_sum[10s]))")
            window_inbound = (tot-init_val)/20
            window_completed = completed - init_val_completed
            window_latency = latency - init_val_latency
            print("INBOUND: " + str(window_inbound) + " COMPLETED: " + str(window_completed) + " AVG LAT: " + str(window_latency/(window_completed if window_completed > 0 else 1)))
            if tot - init_val > 0 or started:
                init_val = tot if started else init_val
                init_val_completed = completed if started else init_val_completed
                init_val_latency = latency if started else init_val_latency
                sl = 20 if started else 19
                started = True
                stop = time.time()
                time_difference_ms = stop - start
                sl -= time_difference_ms
            time.sleep(sl)

if __name__ == "__main__":

    prometheus_service_address = "localhost"
    prometheus_service_port = 56339
    prometheus_url = f"http://{prometheus_service_address}:{prometheus_service_port}"
    logger = Logger(PrometheusConnect(url=prometheus_url))


    threading.Thread(target=logger.log).start()