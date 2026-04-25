import sys
import asyncio
from torrentp import TorrentDownloader

async def main():
    magnet = "magnet:?xt=urn:btih:dd8255ecdc7ca55fb0bbf81323d87062db1f6d1c&dn=Big+Buck+Bunny"
    print("Initializing...")
    td = TorrentDownloader(magnet, '.')
    print(dir(td))
    # Let's see if we can get the size
    # We will just start it and run for 2 seconds
    task = asyncio.create_task(td.start_download())
    await asyncio.sleep(2)
    td.pause_download()
    
    # Try to find the handle or size
    for attr in dir(td):
        val = getattr(td, attr)
        print(f"{attr}: {val}")

asyncio.run(main())