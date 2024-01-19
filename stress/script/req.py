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
    requests = [30, 60, 60, 90, 90, 120, 150, 154, 90, 90, 60, 60]
    durations = [11, 10, 15, 20, 30, 40, 50, 60, 30, 20, 15, 10]
    for nreqs, duration in zip(requests, durations):
        print(f"Sending {nreqs} requests per second for {duration} seconds")
        asyncio.run(make_requests_per_second(nreqs, duration))