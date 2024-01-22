import time
import os
import requests

SLEEP_TIME = 2


def guard() -> None:
    """
    This method is executed in a separate thread.
    Check the conditions of the system and eventually scale it.
    """
    print("Monitoring the system...")
    while True:
        # inbound_workload = self.get_inbound_workload()
        # current_mcl = self.scaler.get_mcl()
        # print(f"Current mcl: {current_mcl}")
        # print(f"Inbound workload: {inbound_workload}")
        # if self.should_scale(inbound_workload, current_mcl):
        # print("Scaling the system...")
        # self.scaler.process_request(inbound_workload)
        print("Checked sys condition")
        time.sleep(SLEEP_TIME)


def get_inbound_workload() -> int:
    """
    Return the inbound workload of the system,
    querying the external monitoring system.
    """
    monitor_url = os.environ.get("MONITOR_URL")
    if monitor_url:
        endpoint = monitor_url + "/inboundWorkload"
        response = requests.get(endpoint).json()
        print(f"Inbound workload registered {response['inbound_workload']}")
        return response["inbound_workload"]
    else:
        raise Exception("MONITOR_URL not set")


if __name__ == '__main__':
    guard()
