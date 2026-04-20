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


# Minimum synthetic-video duration for still-image inputs. TRIBE predicts at
# ~1 Hz, so a 1-second clip only gave us T=1 and a single static activation
# map. 10 seconds yields T≈10 timesteps — enough for the Replay scrubber,
# the per-region time series, and the peak-moment rules to do real work on
# image uploads.
IMAGE_VIDEO_DURATION_SECONDS = 10


def image_to_video(
    image_path: Path,
    duration_seconds: int = IMAGE_VIDEO_DURATION_SECONDS,
) -> Path:
    """Still-image → looped N-second, 25 fps mp4 so TRIBE (video-native) can
    consume it and produce a real time series.

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
            "-t", str(duration_seconds),
            "-r", "25",
            "-pix_fmt", "yuv420p",
            "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
            str(out),
        ],
        check=True,
    )
    return out
