"""Shared services formats helpers."""
import re

DOWNLOAD_ID_RE = re.compile(r"^[A-Za-z0-9_-]{8,64}$")

AUDIO_FMTS = {"mp3", "flac", "wav", "ogg", "opus", "m4a"}

FFMPEG_LOCAL_PROTOCOLS = "file,pipe,crypto,data"

FFMPEG_LOCAL_DEMUXERS = "mov,matroska,webm,avi,asf,flv,mpeg,mpegts,mp3,wav,flac,ogg,aac,aiff"

FFMPEG_POST_DEMUXERS = FFMPEG_LOCAL_DEMUXERS + ",image2,image2pipe,png_pipe,jpeg_pipe,webp_pipe,gif,ass,srt,webvtt,ffmetadata"

_NON_MEDIA_EXTENSIONS = {
    ".part", ".ytdl", ".srt", ".vtt", ".ass", ".lrc", ".json",
    ".jpg", ".jpeg", ".png", ".webp",
}

ALLOWED_SPONSORBLOCK_CATEGORIES = {
    "sponsor", "intro", "outro", "selfpromo", "preview",
    "filler", "interaction", "music_offtopic", "poi_highlight",
    "chapter", "exclusive_access",
}

ALLOWED_DOWNLOAD_FORMATS = {"mp4", "webm", "mkv", "avi", "mov"} | AUDIO_FMTS

ALLOWED_VIDEO_CODECS = {"h264", "av1", "vp9"}

PREPARED_TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{40,64}$")

ALLOWED_CONVERT_FORMATS = {
    "mp3", "m4a", "aac", "opus", "ogg", "flac", "wav", "aiff", "wma",
    "mp4", "webm", "mkv", "mov", "avi", "m4v", "3gp", "ts", "wmv",
}

ALLOWED_INPUT_EXTS = {
    ".mp3", ".flac", ".wav", ".ogg", ".opus", ".m4a", ".aac", ".aiff", ".aif", ".wma",
    ".mp4", ".webm", ".mkv", ".avi", ".mov", ".m4v", ".flv", ".wmv", ".3gp", ".ts", ".m2ts",
}

ALLOWED_CONVERT_MODES = {"auto", "remux", "transcode"}
