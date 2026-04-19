"""File I/O helpers. TRIBE v2 handles its own frame/audio extraction, so
this module only needs to stage the input file locally for it.
"""
from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path

import httpx


def download_file(url: str, suffix: str) -> Path:
    """Download a URL to a NamedTemporaryFile on local disk, return the path."""
    with httpx.Client(follow_redirects=True, timeout=60) as client:
        response = client.get(url)
        response.raise_for_status()
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp.write(response.content)
    tmp.close()
    return Path(tmp.name)


def image_to_video(image_path: Path) -> Path:
    """Still-image → 1 second, 25 fps mp4 so TRIBE (video-native) can consume it.

    Requires `ffmpeg` on PATH. The Modal image installs it via apt.
    """
    out = Path(tempfile.NamedTemporaryFile(delete=False, suffix=".mp4").name)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-loglevel", "error",
            "-loop", "1",
            "-i", str(image_path),
            "-t", "1",
            "-r", "25",
            "-pix_fmt", "yuv420p",
            "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
            str(out),
        ],
        check=True,
    )
    return out
