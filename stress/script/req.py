import asyncio
import aiohttp
import time

url = 'http://localhost:8010'


async def make_requests_per_second(nreqs, target_rate, duration):
    async with aiohttp.ClientSession() as session:
        start_time = time.time()
        while time.time() - start_time <= duration:
            for _ in range(nreqs):
                async with session.post(url) as _:
                    time.sleep(target_rate)

if __name__ == '__main__':
    loop = asyncio.get_event_loop()
    requests = [30, 60, 60, 90, 90, 120, 150, 154, 90, 90, 60, 60]
    durations = [5, 10, 15, 20, 30, 40, 50, 60, 30, 20, 15, 10]
    for nreqs, duration in zip(requests, durations):
        print(f"Sending {nreqs} requests per second for {duration} seconds")
        target_rate = 1 / nreqs if nreqs else 0
        loop.run_until_complete(asyncio.gather(make_requests_per_second(nreqs, target_rate, duration)))