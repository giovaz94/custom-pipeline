package main

import (
	"fmt"
	"net"
	"net/http"
	"sync"
	"time"
)

var (
	url      = "http://188.166.133.193/"
	requests = []int{600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600}
)

func makeRequestsPerSecond(rps int, wg *sync.WaitGroup, sem chan struct{}) {
	defer wg.Done()

	client := &http.Client{
		Transport: &http.Transport{
			Proxy: http.ProxyFromEnvironment,
			DialContext: (&net.Dialer{
				Timeout:   90 * time.Second,
				KeepAlive: 90 * time.Second,
			}).DialContext,
			MaxIdleConnsPerHost:   rps,
			MaxIdleConns:          rps,
			IdleConnTimeout:       90 * time.Second,
			TLSHandshakeTimeout:   90 * time.Second,
			ExpectContinueTimeout: 90 * time.Second,
		},
		Timeout: 90 * time.Second, // Adjust the overall timeout if needed
	}

	delay := time.Second / time.Duration(rps)
	ticker := time.NewTicker(delay)
	defer ticker.Stop()

	for i := 0; i < rps; i++ {
		select {
		case <-ticker.C:
			// Acquire semaphore
			sem <- struct{}{}

			go func() {
				defer func() {
					// Release semaphore
					<-sem
				}()

				req, err := http.NewRequest("POST", url, nil)
				if err != nil {
					fmt.Println("Error creating request:", err)
					return
				}
				req.Close = false // Enable Keep-Alive

				// Fire and forget the request
				go func() {
					_, err := client.Do(req)
					if err != nil {
						fmt.Println("Error sending request:", err)
					}
				}()
			}()
		}
	}
}

func main() {
	var wg sync.WaitGroup
	sem := make(chan struct{}, 1000) // Limit to 1000 concurrent goroutines

	for _, r := range requests {
		fmt.Printf("Sending %d requests per second\n", r)
		wg.Add(1)
		go makeRequestsPerSecond(r, &wg, sem)
		time.Sleep(time.Second)
	}
	wg.Wait()
}
