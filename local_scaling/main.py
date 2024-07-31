import time

import yaml
from kubernetes import client, config
from prometheus_api_client import PrometheusConnect
from prometheus_client import start_http_server, Gauge
from deployment import deploy_pod, delete_pod
import os
import asyncio
from threading import Thread
import math


if __name__ == '__main__':

    SLEEP_TIME = float(os.environ.get("SLEEP_TIME", "10"))
    COMPONENT_MCL = float(os.environ.get("COMPONENT_MCL", "120"))
    COMPONENT_MF = float(os.environ.get("COMPONENT_MF", "2"))
    K_BIG = int(os.environ.get("K_BIG", "20"))
    K = int(os.environ.get("K", "10"))
    METRIC_NAME = os.environ.get("METRIC_NAME", "http_requests_total_virus_scanner_counter")
    MANIFEST_NAME = os.environ.get("MANIFEST_NAME", "parser")
    SERVICE_PORT = int(os.environ.get("SERVICE_PORT", "7100"))

    IN_CLUSTER = os.environ.get("IN_CLUSTER", "false").lower() == 'true'

    if IN_CLUSTER:
        config.load_incluster_config()
    else:
        config.load_kube_config()

    k8s_client = client.CoreV1Api()

    prometheus_service_address = os.environ.get("PROMETHEUS_SERVICE_ADDRESS", "152.42.151.115")
    prometheus_service_port = os.environ.get("PROMETHEUS_SERVICE_PORT", "8080")
    prometheus_url = f"http://{prometheus_service_address}:{prometheus_service_port}"
    prometheus_instance = PrometheusConnect(url=prometheus_url)

    instances_number = Gauge('total_instances_number', 'Present in the system')

    def startup_event_loop(event_loop):
        asyncio.set_event_loop(event_loop)
        event_loop.run_forever()

    el = asyncio.new_event_loop()
    Thread(target=lambda: startup_event_loop(el), daemon=True).start()

    def guard(starting_mcl, starting_instances) -> None:
        """
        This method is executed in a separate thread.
        Check the conditions of the system and eventually scale it.
        """
        print("Monitoring the system...")
        current_mcl = starting_mcl
        number_of_instances = starting_instances
        #res = prometheus_instance.custom_query(METRIC_NAME)
        #res = prometheus_instance.custom_query(f"sum(increase({METRIC_NAME}[10s]))")
        #init_val = float(res[0]['value'][1])
        sl = 1
        iter = 0
        while True:
            print("Checking the system...", flush=True)
            start = time.time()
            res = prometheus_instance.custom_query(f"sum(increase({METRIC_NAME}[10s]))")
            tot = float(res[0]['value'][1])
            print(tot)

            #measured_workload = (tot - init_val) / SLEEP_TIME
            measured_workload = tot / SLEEP_TIME
            target_workload = measured_workload

            if iter > 0 and should_scale(target_workload, current_mcl):
                instances = math.ceil(target_workload/COMPONENT_MCL)
                print(f"Target WL: {target_workload}")
                print(f"Current MCL {current_mcl}, Future MCL: {COMPONENT_MCL * instances}")
                print(f"Instances: {instances}")
                deployment = k8s_client.read_namespaced_deployment(name=MANIFEST_NAME, namespace='default')
                deployment.spec.replicas = instances
                k8s_client.patch_namespaced_deployment(name=MANIFEST_NAME, namespace='default', body=deployment)
                number_of_instances = instances
                current_mcl = COMPONENT_MCL * instances

            if tot > 0:
                #init_val = tot if iter > 0 else init_val
                sl = SLEEP_TIME if iter > 0 else SLEEP_TIME - sl
                iter += sl
                stop = time.time()
                time_difference = stop - start
                sl -= time_difference

            instances_number.set(number_of_instances)
            time.sleep(sl)

    def should_scale(inbound_workload, curr_mcl) -> bool:

        return inbound_workload - (curr_mcl - K_BIG) > K or \
            (curr_mcl - K_BIG) - inbound_workload > K

    # def configure_system(target_workload) -> tuple[int, int]:
    #     instances = 1
    #     mcl = estimate_mcl(instances)
    #     while not configuration_found(mcl, target_workload, K_BIG):
    #         instances += 1
    #         mcl = estimate_mcl(instances)
    #     return instances, mcl

    # def estimate_mcl(deployed_instances) -> int:
    #     return deployed_instances * COMPONENT_MCL

    def configuration_found(sys_mcl, target_workload, k_big) -> bool:
        return sys_mcl - (target_workload + k_big) >= 0

    start_http_server(SERVICE_PORT)
    guard(COMPONENT_MCL, 1)

