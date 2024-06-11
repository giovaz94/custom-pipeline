import requests
import concurrent.futures
import time
import resource

# Replace with your target IP address
ip_address = 'http://152.42.150.86'
requests_payload = [150 for _ in range(100)]

def send_request():
    try:
        response = requests.post(ip_address, data={})
        return response.status_code
    except requests.exceptions.RequestException as e:
        return f"Error: {e}"

def send_requests_per_second(rate):
    with concurrent.futures.ThreadPoolExecutor(max_workers=rate) as executor:
        futures = [executor.submit(send_request) for _ in range(rate)]
        results = [future.result() for future in concurrent.futures.as_completed(futures)]
        ok_responses = [r for r in results if r == 201]
        not_ok_responses = [r for r in results if r != 201]

        print(f"Requests sent: {rate}, Good Responses: {len(ok_responses)}, Bad Responses: {len(not_ok_responses)}")

def main():
    for rate in requests_payload:
        start_time = time.time()
        send_requests_per_second(rate)
        elapsed_time = time.time() - start_time
        time_to_wait = max(0, 1 - elapsed_time)
        time.sleep(time_to_wait)

if __name__ == '__main__':
     
    # Increase the limit of open file descriptors
    soft, hard = resource.getrlimit(resource.RLIMIT_NOFILE)
    resource.setrlimit(resource.RLIMIT_NOFILE, (hard, hard))
    
    main()