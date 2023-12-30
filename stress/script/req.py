import argparse
import requests
import time

# Requests per second
request_array = [60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60]

def calculate_sleep_time(n_request: int) -> int:
    """
    Calculate the sleep time based on the number of requests.
    
    Arguments:
    ----------
        n_request (int): The number of requests
    """
    if n_request == 0:
        return 0
    else:
        return 1 / n_request

def send_request(url: str, port: int, type: str, status: int = 200 ,body=None, header=None, output=False) -> None:
    """
    Send a request to the specified url and port.
    
    Arguments:
    ----------
        url (str): The url of the entrypoint
        port (int): The port of the entrypoint
        type (str): The type of the request (GET, POST, PUT, DELETE)
        body (str): The body of the request
        header (str): The header of the request
    """

    full_url = f'http://{url}:{port}'
    try:
        if type == 'GET':
            response = requests.get(full_url, headers=header)
        elif type == 'POST':
            response = requests.post(full_url, body, headers=header)
        elif type == 'PUT':
            response = requests.put(full_url, body, headers=header)
        elif type == 'DELETE':
            response = requests.delete(full_url, headers=header)
        else:
            print('Invalid request type. Please use GET, POST, PUT, or DELETE.')
            return

        if response.status_code == status:
            if output:
                print(f'{type} request was successful')
                print('Response content:')
                print(response.text)
        else:
            print(f'{type} request failed with status code: {response.status_code}')

    except requests.exceptions.RequestException as e:
        print(f'An error occurred: {e}')

if __name__  == "__main__":
    
    parser = argparse.ArgumentParser(description="A simple request script for testing the pipeline")
    
    # Options
    parser.add_argument("-u", "--url", help="URL of the entrypoint")
    parser.add_argument("-p", "--port", help="Port of the entrypoint")
    parser.add_argument("-t", "--type", help="The type of the request (GET, POST, PUT, DELETE)")
    parser.add_argument("-b", "--body", help="The body of the request")
    parser.add_argument("-H", "--header", help="The header of the request")
    parser.add_argument("-r", "--response", help="The expected response of the request")
    parser.add_argument("-n", "--nreq", help="The number of requests to be sent in a second")

    # Parse arguments
    args = parser.parse_args()

    # Check if the arguments are provided and if the type is valid
    if not args.url or not args.port or not args.type:
        parser.print_help()
        exit(1)
    
    # Check the type of the arguments
    if args.type not in ["GET", "POST", "PUT", "DELETE"]:
        print(f'Invalid type of request: {args.type}')
        exit(1)

    for request in request_array:
        sleep_time = calculate_sleep_time(request)
        print(f'Sending {request} requests per second with sleep time: {sleep_time}')
        for i in range(request):
            send_request(args.url, int(args.port), args.type, int(args.response), args.body, args.header, False)
            time.sleep(sleep_time)




