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
        init_compl = self._execute_prometheus_query("sum(http_requests_total_global)")
        init_lat = self._execute_prometheus_query("sum(http_requests_total_time)")
        sl = self.sleep
        started = False
        time_difference_ms = 0
        while True:
            start = time.time()
            tot = self._execute_prometheus_query("sum(http_requests_total_parser)")
            completed = self._execute_prometheus_query("sum(http_requests_total_global)")
            latency = self._execute_prometheus_query("sum(http_requests_total_time)")
            window_inbound = (tot-init_val)/10
            window_compl = completed - init_compl
            window_lat = latency - init_lat
            print("INBOUND: " + str(window_inbound) + " COMPLETED: " + str(window_compl) + " AVG LAT: " + str(window_lat/(window_compl if window_compl > 0 else 1)))
            if tot - init_val > 0 or started:
                init_val = tot if started else init_val
                init_compl = completed if started else init_compl 
                init_lat = latency if started else init_lat 
                sl = 10 if started else 9
                started = True
                stop = time.time()
                time_difference_ms = stop - start
                sl -= time_difference_ms
            time.sleep(sl)

if __name__ == "__main__":

    prometheus_service_address = "localhost"
    prometheus_service_port = 56385
    prometheus_url = f"http://{prometheus_service_address}:{prometheus_service_port}"
    logger = Logger(PrometheusConnect(url=prometheus_url))


    threading.Thread(target=logger.log).start()