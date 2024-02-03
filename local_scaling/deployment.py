import yaml
import time
from kubernetes.client.rest import ApiException


def deploy_pod(client, manifest_file_path) -> None:
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
            print(f"Deploying pod {pod_name}...")
            while True:
                pod_info = client.read_namespaced_pod_status(pod_name, "default")
                if pod_info.status.phase == 'Running':
                    print(f"Pod {pod_name} is now running!")
                    break
                time.sleep(1)
    except ApiException as e:
        raise Exception(f"Error deploying pod: {e}")


def delete_pod(client, pod_name) -> None:
    """
    Delete a pod by name.

    Arguments
    -----------
    pod_name -> the name of the pod to delete
    """
    try:
        client.delete_namespaced_pod(name=pod_name, namespace="default")
        timeout = time.time() + 60  # Timeout after 60 seconds
        while True:
            try:
                client.read_namespaced_pod_status(pod_name, "default")
            except ApiException as e:
                if e.status == 404:
                    print(f"Pod {pod_name} has been deleted!")
                    break
            if time.time() > timeout:
                print(f"Timeout waiting for pod deletion.")
                break
            time.sleep(1)
    except Exception as e:
        raise Exception(f"Error deleting pod: {e}")


def delete_pod_by_image(client, image_name) -> None:
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
                    pod.metadata.name.startswith("sys-pod") and \
                    pod.status.phase == "Running":

                pod_name = pod.metadata.name
                delete_pod(client, pod_name)
                break
    except Exception as e:
        raise Exception(f"Error deleting pod: {e}")