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
    requests = [1, 15, 15, 15, 15, 15, 15, 15, 15, 156, 140, 120, 90, 80, 30]
    durations = [300, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
    for nreqs, duration in zip(requests, durations):
        print(f"Sending {nreqs} requests per second for {duration} seconds")
        asyncio.run(make_requests_per_second(nreqs, duration))