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
        sl = self.sleep
        started = False
        time_difference_ms = 0
        while True:
            start = time.time()
            tot = self._execute_prometheus_query("sum(http_requests_total_parser)")
            completed = self._execute_prometheus_query("sum(increase(http_requests_total_virus_scanner_counter[10s]))")
            #latency = self._execute_prometheus_query("sum(increase(http_requests_total_time[10s]))")
            window_inbound = (tot-init_val)/10
            #print("INBOUND: " + str(window_inbound) + " COMPLETED: " + str(completed) + " AVG LAT: " + str(latency/(completed if completed > 0 else 1)))
            print("INBOUND: " + str(window_inbound) + " COMPL: " + str(completed))
            if tot - init_val > 0 or started:
               init_val = tot if started else init_val
               sl = 10 if started else 9
               started = True
               stop = time.time()
               time_difference_ms = stop - start
               sl -= time_difference_ms
            time.sleep(sl)

if __name__ == "__main__":

    prometheus_service_address = "143.198.251.80"
    prometheus_service_port = 8080
    prometheus_url = f"http://{prometheus_service_address}:{prometheus_service_port}"
    logger = Logger(PrometheusConnect(url=prometheus_url))


    threading.Thread(target=logger.log).start()