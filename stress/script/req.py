
import argparse







if __name__  == "__main__":
    check_response = False
    n_request = 100
    parser = argparse.ArgumentParser(description="A simple request script for testing the pipeline")
    
    # Options
    parser.add_argument("-u", "--url", help="URL of the entrypoint")
    parser.add_argument("-p", "--port", help="Port of the entrypoint")
    parser.add_argument("-t", "--type", help="The type of the request (GET, POST, PUT, DELETE)")
    parser.add_argument("-b", "--body", help="The body of the request")
    parser.add_argument("-H", "--header", help="The header of the request")
    parser.add_argument("-r", "--response", help="The expected response of the request")
    parser.add_argument("-n", "--nreq", help="The number of requests to be sent (default: 100)")

    # Parse arguments
    args = parser.parse_args()

    # Check if the arguments are provided and if the type is valid
    if not args.url or not args.port or not args.type:
        parser.print_help()
        exit(1)
    
    # Check the type of the arguments
    if args.type not in ["GET", "POST", "PUT", "DELETE"]:
        print("Invalid type of request: ${args.type}")
        parser.print_help()
        exit(1)
    
    # Check response flag
    if args.response:
        check_response = True
    
    # Check number of requests
    if args.nreq:
        n_request = int(args.nreq)
