import sys
import json
import asyncio
import os
from pathlib import Path

class DummyConsole:
    def print(self, *args, **kwargs): pass
    def update(self, *args, **kwargs): pass

try:
    import libtorrent as lt
    LIBTORRENT_AVAILABLE = True
except ImportError as e:
    LIBTORRENT_AVAILABLE = False
    IMPORT_ERROR = str(e)

def log_event(level, message, data=None):
    if data is None:
        data = {}
    print(json.dumps({"type": "log", "level": level, "message": message, "data": data}))
    sys.stdout.flush()

def sanitize_component(value, fallback):
    cleaned = ''.join(' ' if ch in '<>:"/\\|?*' or ord(ch) < 32 else ch for ch in str(value or fallback))
    cleaned = ' '.join(cleaned.split()).strip(' .')
    return cleaned[:120] or fallback

def rename_torrent_files(handle, target_folder):
    torrent_info = handle.torrent_file()
    files = torrent_info.files()
    used_names = set()
    renamed = 0

    for index in range(files.num_files()):
        original_path = files.file_path(index).replace("\\", "/")
        original_name = original_path.split("/")[-1] or files.file_name(index)
        safe_name = sanitize_component(original_name, f"file-{index}")

        stem, extension = os.path.splitext(safe_name)
        candidate = safe_name
        suffix = 2
        while candidate.lower() in used_names:
            candidate = f"{stem} ({suffix}){extension}"
            suffix += 1

        used_names.add(candidate.lower())
        handle.rename_file(index, f"{target_folder}/{candidate}")
        renamed += 1

    log_event("info", "Torrent files renamed", {
        "target_folder": target_folder,
        "file_count": renamed
    })

async def download_mock(magnet, save_path, expected_size):
    log_event("info", "Starting mock download (libtorrent unavailable)", {"magnet": magnet})
    os.makedirs(save_path, exist_ok=True)
    mock_file = os.path.join(save_path, "mock_download.bin")

    downloaded = 0
    chunk_size = expected_size // 10 if expected_size > 0 else 1024*1024*100

    with open(mock_file, "wb") as f:
        while downloaded < expected_size:
            write_size = min(chunk_size, expected_size - downloaded)
            f.write(b"\0" * write_size)
            downloaded += write_size
            log_event("debug", "Mock downloading...", {"downloaded": downloaded, "expected_size": expected_size})
            await asyncio.sleep(1)

    log_event("info", "Mock download completed")

async def download_torrent(magnet, save_path, expected_size, download_speed=0, upload_speed=0):
    save_root = os.path.dirname(save_path)
    target_folder = sanitize_component(os.path.basename(save_path), "Download")
    log_event("info", "Initializing torrent session", {
        "save_root": save_root,
        "target_folder": target_folder,
        "expected_size": expected_size,
        "download_speed_limit": download_speed,
        "upload_speed_limit": upload_speed
    })

    if not LIBTORRENT_AVAILABLE:
        log_event("warn", f"libtorrent unavailable ({IMPORT_ERROR}). Falling back to mock implementation.")
        await download_mock(magnet, save_path, expected_size)
        return

    os.makedirs(save_root, exist_ok=True)
    session = lt.session({"listen_interfaces": "0.0.0.0:6881-6891"})

    session_settings = {
        "connections_limit": 500,
        "unchoke_slots_limit": 80,
        "active_downloads": 8,
        "active_seeds": 8,
        "active_limit": 16,
        "enable_dht": True,
        "enable_lsd": True,
        "enable_upnp": True,
        "enable_natpmp": True,
        "auto_manage_interval": 20,
        "tick_interval": 500,
    }

    if download_speed > 0:
        session_settings["download_rate_limit"] = download_speed * 1024
    if upload_speed > 0:
        session_settings["upload_rate_limit"] = upload_speed * 1024

    session.apply_settings(session_settings)

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
    params.save_path = save_root
    handle = session.add_torrent(params)

    log_event("info", "Fetching magnet metadata")
    while not handle.has_metadata():
        await asyncio.sleep(2)
        status = handle.status()
        log_event("debug", "Progress update", {
            "downloaded_bytes": int(status.total_wanted_done),
            "total_wanted": int(status.total_wanted) if status.total_wanted > 0 else int(expected_size),
            "progress_percent": round(float(status.progress) * 100, 2),
            "download_rate": int(status.download_rate),
            "upload_rate": int(status.upload_rate),
            "num_peers": int(status.num_peers),
            "is_seeding": bool(status.is_seeding),
            "state": int(status.state),
        })

    log_event("info", "Metadata fetched successfully")
    rename_torrent_files(handle, target_folder)

    while True:
        status = handle.status()
        total_wanted = int(status.total_wanted) if status.total_wanted > 0 else int(expected_size)
        downloaded_bytes = int(status.total_wanted_done)
        progress_percent = round(float(status.progress) * 100, 2) if total_wanted > 0 else 0.0

        log_event("debug", "Progress update", {
            "downloaded_bytes": downloaded_bytes,
            "total_wanted": total_wanted,
            "progress_percent": progress_percent,
            "download_rate": int(status.download_rate),
            "upload_rate": int(status.upload_rate),
            "num_peers": int(status.num_peers),
            "is_seeding": bool(status.is_seeding),
            "state": int(status.state),
        })

        if status.is_seeding:
            break

        await asyncio.sleep(2)

    log_event("info", "Download task finished")

def main():
    if len(sys.argv) < 4:
        log_event("error", "Missing arguments. Usage: python torrentp_worker.py <magnet> <save_path> <expected_size> [download_speed] [upload_speed]")
        sys.exit(1)

    magnet = sys.argv[1]
    save_path = sys.argv[2]
    expected_size = int(sys.argv[3])
    download_speed = int(sys.argv[4]) if len(sys.argv) > 4 else 0
    upload_speed = int(sys.argv[5]) if len(sys.argv) > 5 else 0

    log_event("info", "Worker started", {
        "magnet": magnet[:50] + "...",
        "save_path": save_path,
        "expected_size": expected_size,
        "download_speed": download_speed,
        "upload_speed": upload_speed
    })

    try:
        asyncio.run(download_torrent(magnet, save_path, expected_size, download_speed, upload_speed))

        actual_size = sum(f.stat().st_size for f in Path(save_path).rglob('*') if f.is_file())
        log_event("info", "Download completed", {
            "expected_size": expected_size,
            "actual_size": actual_size,
            "size_difference": actual_size - expected_size
        })
        print(json.dumps({"type": "result", "status": "success", "actual_size": actual_size}))

    except Exception as e:
        log_event("error", f"Unhandled exception: {str(e)}")
        print(json.dumps({"type": "result", "status": "error", "message": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
