import asyncio
import aiohttp

url = 'http://localhost:8010'

async def make_requests_per_second(nreqs, duration):
    async with aiohttp.ClientSession() as session:
        for _ in range(duration):
            for _ in range(nreqs):
                asyncio.create_task(session.post(url))
                await asyncio.sleep(1/nreqs if nreqs else 0)

if __name__ == '__main__':
    requests = [18, 20, 24, 30, 34, 45, 60, 70, 60, 45, 34, 30, 24, 20, 18]
    durations = [10, 10, 10, 10, 10, 10, 30, 30, 30, 10, 10, 10, 10, 10, 10]
    for nreqs, duration in zip(requests, durations):
        print(f"Sending {nreqs} requests per second for {duration} seconds")
        asyncio.run(make_requests_per_second(nreqs, duration))
