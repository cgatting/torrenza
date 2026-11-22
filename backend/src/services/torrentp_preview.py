import sys
import json
import asyncio
import time

try:
    import libtorrent as lt
    LIBTORRENT_AVAILABLE = True
except ImportError as e:
    LIBTORRENT_AVAILABLE = False
    IMPORT_ERROR = str(e)

async def preview_magnet(magnet, timeout):
    if not LIBTORRENT_AVAILABLE:
        print(json.dumps({
            "status": "unavailable",
            "message": f"libtorrent unavailable ({IMPORT_ERROR})",
        }))
        return

    session = lt.session({"listen_interfaces": "0.0.0.0:6881-6891"})
    session.apply_settings({
        "enable_dht": True,
        "enable_lsd": True,
        "enable_upnp": True,
        "enable_natpmp": True,
    })
    for host, port in (
        ("router.bittorrent.com", 6881),
        ("router.utorrent.com", 6881),
        ("dht.transmissionbt.com", 6881),
    ):
        session.add_dht_router(host, port)
    session.start_dht()
    session.start_lsd()
    session.start_upnp()
    session.start_natpmp()

    params = lt.parse_magnet_uri(magnet)
    params.save_path = "."
    handle = session.add_torrent(params)

    start = time.time()
    while not handle.has_metadata():
        if time.time() - start > timeout:
            print(json.dumps({
                "status": "timeout",
                "message": "Could not fetch metadata within the time limit (no peers/trackers reached).",
            }))
            return
        await asyncio.sleep(1)

    ti = handle.torrent_file()
    files = []
    total_size = 0
    num_files = ti.files().num_files()
    for i in range(num_files):
        file_size = ti.files().file_size(i)
        total_size += file_size
        files.append({
            "path": ti.files().file_path(i).replace("\\", "/"),
            "size": file_size,
        })

    print(json.dumps({
        "status": "ok",
        "name": ti.name(),
        "total_size": total_size,
        "num_files": num_files,
        "files": files,
    }))


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "Missing magnet argument"}))
        return
    magnet = sys.argv[1]
    timeout = int(sys.argv[2]) if len(sys.argv) > 2 else 30
    try:
        asyncio.run(preview_magnet(magnet, timeout))
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))


if __name__ == "__main__":
    main()
