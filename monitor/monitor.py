import requests
import time
import csv
from prometheus_api_client import PrometheusConnect
import threading
from kubernetes import client, config




class Logger:

    def __init__(self, prometheus_instance: PrometheusConnect, sleep: int = 10):
        self.prometheus_instance = prometheus_instance
        self.sleep = sleep
        self.csv_file = open('log.csv', 'a', newline='')
        self.csv_writer = csv.writer(self.csv_file)
        config.load_kube_config()

    def get_pod_count(self, namespace='default'):
        v1 = client.CoreV1Api()
        pods = v1.list_namespaced_pod(namespace)
        return len(pods.items) - 7

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
            print(e)

    def log(self) -> None:
        """
        Log the current state of the system saving the metrics in a csv file.
        Metrics are collected from a Prometheus server.
        """
        print("Logging started")
        init_val = self._execute_prometheus_query("sum(http_requests_total_parser)")
        sl = 1
        time_difference_ms = 0
        iter = 0
        while True:
            start = time.time()
            tot = self._execute_prometheus_query("sum(http_requests_total_parser)")
            completed = self._execute_prometheus_query("sum(increase(http_requests_total_global[10s]))")
            latency = self._execute_prometheus_query("sum(increase(http_requests_total_time[10s]))")
            loss = self._execute_prometheus_query("sum(increase(message_loss[10s]))")
            inst = self.get_pod_count() #self._execute_prometheus_query("sum(total_instances_number)")
            safe_tot = 0 if tot is None else tot
            safe_init_val = 0 if init_val is None else init_val
            
            window_inbound = (safe_tot-safe_init_val)/10

            
            safe_completed = 1 if completed is None or completed <= 0 else completed
            safe_latency = 0 if latency is None else latency
        

            # parser =  self._execute_prometheus_query("sum(increase(http_requests_total_virus_scanner_counter[10s]))")
            # vs = self._execute_prometheus_query("sum(increase(http_requests_total_attachment_manager_counter[10s]))")
            # am = self._execute_prometheus_query("sum(increase(http_requests_total_image_analyzer_counter[10s]))")
            # ia = self._execute_prometheus_query("sum(increase(http_requests_total_message_analyzer_counter[10s]))")

            print(str(iter) + " " + str(safe_latency/safe_completed) + " measured: " + str(window_inbound) + " tot: " + str(window_inbound*10) 
                  + " comp: " + str(completed) + " rej: " + str(loss)  + " inst: " + str(inst))            
            # print("INBOUND: " + str(window_inbound) + " COMPLETED: " + str(completed) + " AVG LAT: " + str(latency/(completed if completed > 0 else 1)) 
            #       + " VS: " + str(parser) + " AM: " + str(vs) + " IA: " + str(am) + " MA: " + str(ia) +  " inst: " + str(3+inst))
            if tot - init_val > 0 or iter > 0:
                init_val = tot if iter > 0 else init_val
                sl = self.sleep if iter > 0 else self.sleep - sl
                iter += self.sleep
                stop = time.time()
                time_difference_ms = stop - start
                sl -= time_difference_ms
            time.sleep(sl)

if __name__ == "__main__":

    prometheus_service_address = "100.66.83.79"
    prometheus_service_port = 30000
    prometheus_url = f"http://{prometheus_service_address}:{prometheus_service_port}"
    logger = Logger(PrometheusConnect(url=prometheus_url))


    threading.Thread(target=logger.log).start()