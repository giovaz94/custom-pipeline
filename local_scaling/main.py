import time

import yaml
from kubernetes import client, config
from prometheus_api_client import PrometheusConnect
from prometheus_client import start_http_server
from deployment import deploy_pod, delete_pod_by_image
import os
import requests

if __name__ == '__main__':

    SLEEP_TIME = float(os.environ.get("SLEEP_TIME"))
    COMPONENT_MCL = float(os.environ.get("COMPONENT_MCL"))
    COMPONENT_MF = float(os.environ.get("COMPONENT_MF"))
    K_BIG = int(os.environ.get("K_BIG"))
    K = int(os.environ.get("K"))
    INBOUND_WORKLOAD_METRIC = os.environ.get("INBOUND_WORKLOAD_METRIC")
    MANIFEST_NAME = os.environ.get("MANIFEST_NAME")
    SERVICE_PORT = int(os.environ.get("SERVICE_PORT"))

    config.load_incluster_config()
    k8s_client = client.CoreV1Api()

    prometheus_service_address = os.environ.get("PROMETHEUS_SERVICE_ADDRESS", "localhost")
    prometheus_service_port = os.environ.get("PROMETHEUS_SERVICE_PORT", "8080")
    prometheus_url = f"http://{prometheus_service_address}:{prometheus_service_port}"
    prometheus_instance = PrometheusConnect(url=prometheus_url)


    def guard(starting_mcl, starting_instances) -> None:
        """
        This method is executed in a separate thread.
        Check the conditions of the system and eventually scale it.
        """
        print("Monitoring the system...")
        current_mcl = starting_mcl
        number_of_instances = starting_instances
        while True:
            inbound_workload = get_inbound_workload()
            if inbound_workload is None:
                continue

            if should_scale(inbound_workload, current_mcl):
                instances, mcl = configure_system(inbound_workload)
                if instances > number_of_instances:
                    for _ in range(instances - number_of_instances):
                        deploy_pod(k8s_client, f"./src/{MANIFEST_NAME}.yaml")
                elif instances < number_of_instances:

                    with open(f"./src/{MANIFEST_NAME}.yaml", 'r') as manifest_file:
                        pod_manifest = yaml.safe_load(manifest_file)
                        image_name = pod_manifest["spec"]["containers"][0]["image"]

                        for _ in range(number_of_instances - instances):
                            delete_pod_by_image(k8s_client, image_name, await_deletion=True)

                number_of_instances = instances
                current_mcl = mcl

            time.sleep(SLEEP_TIME)


    def get_inbound_workload() -> float:
        """
        Return the inbound workload of the system
        """
        if not INBOUND_WORKLOAD_METRIC:
            raise Exception("No inbound workload metric specified")

        query = f"sum(rate({INBOUND_WORKLOAD_METRIC}[10s])) by (instaces)"
        try:
            data = prometheus_instance.custom_query(query)
            metric_value = data[0]['value'][1]
            return float(metric_value)
        except (requests.exceptions.RequestException, KeyError, IndexError) as e:
            print("Error:", e)


    def should_scale(inbound_workload, curr_mcl) -> bool:
        print(f"Current MCL: {curr_mcl}")
        print(f"Inbound workload: {inbound_workload}")
        print(f"K_BIG: {K_BIG}")
        print(f"K: {K}")

        print(f"condition (inbound_workload + K_BIG) - curr_mcl > K: {(inbound_workload + K_BIG) - curr_mcl > K}")
        print(f"condition curr_mcl - (inbound_workload + K_BIG) > K: {curr_mcl - (inbound_workload + K_BIG) > K}")

        return inbound_workload - (curr_mcl - K_BIG) > K or \
            (curr_mcl - K_BIG) - inbound_workload > K


    def configure_system(target_workload) -> tuple[int, int]:
        instances = 1
        mcl = estimate_mcl(instances)
        while not configuration_found(mcl, target_workload, K_BIG):
            instances += 1
            mcl = estimate_mcl(instances)
        return instances, mcl


    def estimate_mcl(deployed_instances) -> int:
        return deployed_instances * (COMPONENT_MCL / COMPONENT_MF)


    def configuration_found(sys_mcl, target_workload, k_big) -> bool:
        return sys_mcl - (target_workload + k_big) >= 0

    start_http_server(SERVICE_PORT)
    guard(COMPONENT_MCL, 1)

