import subprocess
from functools import lru_cache

from app.core.config import settings


class AudioProcessingError(Exception):
    pass


class AudioTranscoder:
    def to_wav(self, audio: bytes) -> bytes:
        try:
            result = subprocess.run(
                [
                    "ffmpeg",
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-i",
                    "pipe:0",
                    "-t",
                    str(settings.max_audio_seconds),
                    "-ac",
                    "1",
                    "-ar",
                    "16000",
                    "-f",
                    "wav",
                    "pipe:1",
                ],
                input=audio,
                capture_output=True,
                check=False,
                timeout=45,
            )
        except (FileNotFoundError, subprocess.TimeoutExpired) as exc:
            raise AudioProcessingError("Audio processing is unavailable") from exc

        if result.returncode != 0 or not result.stdout.startswith(b"RIFF"):
            raise AudioProcessingError("The uploaded audio is invalid")
        return result.stdout


@lru_cache
def get_audio_transcoder() -> AudioTranscoder:
    return AudioTranscoder()
