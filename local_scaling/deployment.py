import yaml
import time
import os
from kubernetes.client.rest import ApiException
from prometheus_client import Gauge

DB_URL = os.environ.get("DB_URL")
deployed_pods_gauge = Gauge('deployed_pods', 'Number of deployed pods')


def deploy_pod(client, manifest_file_path, await_running=False) -> None:
    """
    Deploy a pod in the cluster.

    Arguments
    -----------
    manifest_file_path -> path to the manifest file to deploy
    """
    try:
        with open(manifest_file_path, 'r') as manifest_file:
            pod_manifest = yaml.safe_load(manifest_file)
            pod = client.create_namespaced_pod(body=pod_manifest, namespace="default")
            pod_name = pod.metadata.name
            if await_running:
                while True:
                    pod_info = client.read_namespaced_pod_status(pod_name, "default")
                    if pod_info.status.phase == 'Running':
                        break
                time.sleep(1)
            deployed_pods_gauge.inc()
    except ApiException as e:
        raise Exception(f"Error deploying pod: {e}")


def delete_pod(client, pod_name, await_deletion=False) -> None:
    """
    Delete a pod by name.

    Arguments
    -----------
    pod_name -> the name of the pod to delete
    """
    try:
        client.delete_namespaced_pod(name=pod_name, namespace="default")
        if await_deletion:
            while True:
                try:
                    client.read_namespaced_pod_status(pod_name, "default")
                except ApiException as e:
                    if e.status == 404:
                        break
                time.sleep(1)
        deployed_pods_gauge.dec()
    except Exception as e:
        raise Exception(f"Error deleting pod: {e}")


def delete_pod_by_image(client, image_name, await_deletion=False) -> None:
    """
    Delete a pod by image name.
    The deleted pod must be in a healthy state.

    Arguments
    -----------
    image_name -> the image name of the pod to delete
    """

    try:
        pods = client.list_namespaced_pod("default")
        for pod in pods.items:
            if pod.spec.containers[0].image == image_name and \
                    pod.metadata.name.startswith("sys-pod"):

                pod_name = pod.metadata.name
                delete_pod(client, pod_name, await_deletion)
                break
    except Exception as e:
        raise Exception(f"Error deleting pod: {e}")
