import yaml
import time
from kubernetes.client.rest import ApiException
from prometheus_client import Gauge

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
                        print(f"Pod {pod_name} successfully deleted.")
                        break
                time.sleep(1)
        deployed_pods_gauge.dec()
    except ApiException as e:
        if e.status == 404:
            print(f"Pod {pod_name} not found.")
        else:
            raise Exception(f"Error deleting pod: {e}")
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
            found_pod_name = pod.metadata.name
            if (
                 pod.spec.containers[0].image == image_name and
                 pod.metadata.name.startswith("sys-pod") and
                 pod.metadata.deletion_timestamp is None
            ):
                delete_pod(client, found_pod_name, await_deletion)
                break
    except Exception as e:
        raise Exception(f"Error deleting pod: {e}")


def pod_exists(client, pod_name):
    """
    Check if a pod exists in the cluster.

    Arguments
    -----------
    image_name -> the image name of the pod to delete
    """
    try:
        client.read_namespaced_pod(name=pod_name, namespace="default")
        return True
    except ApiException as e:
        if e.status == 404:
            return False
        else:
            raise


