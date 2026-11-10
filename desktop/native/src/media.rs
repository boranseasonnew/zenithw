use crate::{
    arguments::{Download, Tools},
    process::{self, Cancel, Options},
    settings::{Result, move_without_replace},
};
use futures_util::{StreamExt, stream};
use serde_json::Value;
use std::{
    ffi::{OsStr, OsString},
    fs,
    io::{self, Write},
    path::{Path, PathBuf},
    sync::LazyLock,
    time::Duration,
};
use uuid::Uuid;

static PARTIAL_FILE: LazyLock<regex::Regex> =
    LazyLock::new(|| regex::Regex::new(r"(?i)\.(f\d+|temp)\.[^.]+$").unwrap());
static COVER_NAME: LazyLock<regex::Regex> = LazyLock::new(|| {
    regex::Regex::new(r"(?i)^(?:small_)?cover(?:_land)?\.(?:jpe?g|png|webp)$").unwrap()
});

fn link_or_reparse(metadata: &fs::Metadata) -> bool {
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        use windows::Win32::Storage::FileSystem::FILE_ATTRIBUTE_REPARSE_POINT;
        metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT.0 != 0
    }
    #[cfg(not(windows))]
    metadata.file_type().is_symlink()
}

pub fn files(root: &Path) -> Result<Vec<PathBuf>> {
    fn collect(root: &Path, depth: usize, out: &mut Vec<PathBuf>) -> Result<()> {
        if depth > 16 {
            return Err("The output folder is nested too deeply.".into());
        }
        for entry in fs::read_dir(root).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let metadata = entry.metadata().map_err(|e| e.to_string())?;
            if link_or_reparse(&metadata) {
                continue;
            }
            if metadata.is_dir() {
                if !entry
                    .file_name()
                    .to_string_lossy()
                    .starts_with(".zenith-cover-")
                {
                    collect(&entry.path(), depth + 1, out)?;
                }
            } else if metadata.is_file() {
                if out.len() >= 10000 {
                    return Err("Too many output files.".into());
                }
                out.push(entry.path());
            }
        }
        Ok(())
    }
    let mut out = Vec::new();
    collect(root, 0, &mut out)?;
    Ok(out)
}
fn extension(path: &Path) -> String {
    path.extension()
        .unwrap_or_default()
        .to_string_lossy()
        .to_ascii_lowercase()
}
pub fn is_media(path: &Path) -> bool {
    [
        "mp4", "mkv", "webm", "mov", "avi", "m4a", "mp3", "opus", "ogg", "flac", "wav", "aac",
        "flv",
    ]
    .contains(&extension(path).as_str())
}
pub fn partial(path: &Path) -> bool {
    PARTIAL_FILE.is_match(&path.file_name().unwrap_or_default().to_string_lossy())
}
pub async fn probe(tools: &Tools, file: &Path, cancel: &Cancel) -> Result<Value> {
    let args = [
        "-v",
        "error",
        "-show_streams",
        "-show_chapters",
        "-show_format",
        "-of",
        "json",
    ]
    .map(String::from)
    .into_iter()
    .chain([file.to_string_lossy().into_owned()])
    .collect::<Vec<_>>();
    let output = process::run(
        &tools.get("ffprobe.exe")?,
        &args,
        cancel,
        Options {
            timeout: Duration::from_secs(15),
            max_output: 1024 * 1024,
            ..Default::default()
        },
    )
    .await?
    .success()?;
    let data: Value = serde_json::from_str(&output.stdout).map_err(|e| e.to_string())?;
    if data["streams"]
        .as_array()
        .is_none_or(|streams| streams.len() > 256)
    {
        return Err("Invalid media streams.".into());
    }
    Ok(data)
}
fn cover(stream: &Value) -> bool {
    stream["disposition"]["attached_pic"] == 1
        || (stream["codec_type"] == "attachment"
            && stream["tags"]["mimetype"]
                .as_str()
                .is_some_and(|v| ["image/jpeg", "image/png", "image/webp"].contains(&v))
            && COVER_NAME.is_match(stream["tags"]["filename"].as_str().unwrap_or("")))
}
fn signature(stream: &Value) -> Value {
    serde_json::json!([
        stream["codec_type"],
        stream["codec_name"],
        stream["width"],
        stream["height"],
        stream["sample_rate"],
        stream["channels"]
    ])
}
async fn ffmpeg(tools: &Tools, args: Vec<String>, cancel: &Cancel) -> Result<()> {
    process::run(
        &tools.get("ffmpeg.exe")?,
        &args,
        cancel,
        Options {
            timeout: Duration::from_secs(180),
            max_output: 1024 * 1024,
            ..Default::default()
        },
    )
    .await?
    .success()?;
    Ok(())
}
fn base() -> Vec<String> {
    ["-hide_banner", "-loglevel", "error", "-nostdin", "-y"]
        .map(String::from)
        .to_vec()
}
pub async fn square_cover(tools: &Tools, file: &Path, cancel: &Cancel) -> Result<bool> {
    let ext = extension(file);
    if !["mp3", "m4a", "mp4", "flac", "mkv", "mov"].contains(&ext.as_str()) {
        return Err(
            "Square artwork is unavailable for this container; the original cover was retained."
                .into(),
        );
    }
    let original_stat = fs::symlink_metadata(file).map_err(|e| e.to_string())?;
    if !original_stat.is_file() || link_or_reparse(&original_stat) {
        return Err("The output file is not a regular file.".into());
    }
    let original = probe(tools, file, cancel).await?;
    let streams = original["streams"].as_array().unwrap();
    let retained: Vec<_> = streams.iter().filter(|s| !cover(s)).collect();
    let first = retained
        .iter()
        .find(|s| s["codec_type"] == "audio" || s["codec_type"] == "video")
        .ok_or("No media streams.")?;
    let existing = streams
        .iter()
        .find(|s| s["disposition"]["attached_pic"] == 1)
        .or_else(|| streams.iter().find(|s| cover(s)));
    let sidecar = if existing.is_none() {
        ["jpg", "jpeg", "png", "webp"]
            .iter()
            .map(|ext| file.with_extension(ext))
            .find(|p| fs::symlink_metadata(p).is_ok_and(|m| m.is_file() && !link_or_reparse(&m)))
    } else {
        None
    };
    if existing.is_none() && sidecar.is_none() {
        return Ok(false);
    }
    let temp = file
        .parent()
        .unwrap()
        .join(format!(".zenith-cover-{}", Uuid::new_v4()));
    fs::create_dir(&temp).map_err(|e| e.to_string())?;
    let result = async {
        let mut source = sidecar;
        if let Some(existing) = existing.filter(|s| s["codec_type"] == "attachment") {
            let extracted = temp.join("original-cover.bin");
            let mut args = base();
            args.extend([
                format!("-dump_attachment:{}", existing["index"]),
                extracted.to_string_lossy().into_owned(),
                "-i".into(),
                file.to_string_lossy().into_owned(),
                "-map".into(),
                format!("0:{}", first["index"]),
                "-t".into(),
                "0".into(),
                "-c".into(),
                "copy".into(),
                "-f".into(),
                "null".into(),
                "-".into(),
            ]);
            ffmpeg(tools, args, cancel).await?;
            source = Some(extracted);
        }
        let image = temp.join("cover.jpg");
        let mut args = base();
        if let Some(existing) = existing.filter(|s| s["codec_type"] != "attachment") {
            args.extend([
                "-i".into(),
                file.to_string_lossy().into_owned(),
                "-map".into(),
                format!("0:{}", existing["index"]),
            ]);
        } else {
            args.extend([
                "-i".into(),
                source
                    .ok_or("Cover image missing.")?
                    .to_string_lossy()
                    .into_owned(),
                "-map".into(),
                "0:v:0".into(),
            ]);
        }
        args.extend([
            "-frames:v".into(),
            "1".into(),
            "-vf".into(),
            "crop=min(iw\\,ih):min(iw\\,ih),scale=3000:3000:flags=lanczos,setsar=1".into(),
            "-c:v".into(),
            "mjpeg".into(),
            "-q:v".into(),
            "2".into(),
            "-pix_fmt".into(),
            "yuvj420p".into(),
            "-update".into(),
            "1".into(),
            image.to_string_lossy().into_owned(),
        ]);
        ffmpeg(tools, args, cancel).await?;
        let picture = probe(tools, &image, cancel).await?;
        if !picture["streams"]
            .as_array()
            .unwrap()
            .iter()
            .any(|s| s["width"] == 3000 && s["height"] == 3000)
        {
            return Err("The generated cover did not validate.".into());
        }
        let replacement = temp.join(format!("finished.{ext}"));
        let mut args = base();
        args.extend(["-i".into(), file.to_string_lossy().into_owned()]);
        if ext != "mkv" {
            args.extend(["-i".into(), image.to_string_lossy().into_owned()]);
        }
        for stream in &retained {
            args.extend(["-map".into(), format!("0:{}", stream["index"])]);
        }
        if ext != "mkv" {
            args.extend(["-map".into(), "1:v:0".into()]);
        }
        args.extend(
            [
                "-map_metadata",
                "0",
                "-map_chapters",
                "0",
                "-copy_unknown",
                "-c",
                "copy",
            ]
            .map(String::from),
        );
        for (index, stream) in retained.iter().enumerate() {
            args.extend([
                format!("-map_metadata:s:{index}"),
                format!("0:s:{}", stream["index"]),
            ]);
        }
        if ext == "mkv" {
            let index = retained.len();
            args.extend([
                "-attach".into(),
                image.to_string_lossy().into_owned(),
                format!("-metadata:s:{index}"),
                "filename=cover.jpg".into(),
                format!("-metadata:s:{index}"),
                "mimetype=image/jpeg".into(),
                format!("-metadata:s:{index}"),
                "title=Album cover".into(),
            ]);
        } else {
            let index = retained
                .iter()
                .filter(|s| s["codec_type"] == "video")
                .count();
            args.extend([
                format!("-disposition:v:{index}"),
                "attached_pic".into(),
                format!("-metadata:s:v:{index}"),
                "title=Album cover".into(),
                format!("-metadata:s:v:{index}"),
                "comment=Cover (front)".into(),
            ]);
            if ext == "mp3" {
                args.extend(["-id3v2_version".into(), "3".into()]);
            }
        }
        args.push(replacement.to_string_lossy().into_owned());
        ffmpeg(tools, args, cancel).await?;
        let output = probe(tools, &replacement, cancel).await?;
        let output_streams = output["streams"].as_array().unwrap();
        let actual: Vec<_> = output_streams.iter().filter(|s| !cover(s)).collect();
        if actual.len() != retained.len()
            || actual
                .iter()
                .zip(&retained)
                .any(|(a, b)| signature(a) != signature(b))
        {
            return Err("A normal stream changed during cover embedding.".into());
        }
        if output["chapters"].as_array().map(Vec::len)
            != original["chapters"].as_array().map(Vec::len)
        {
            return Err("Chapter information changed.".into());
        }
        let mut valid = output_streams
            .iter()
            .any(|s| cover(s) && s["width"] == 3000 && s["height"] == 3000);
        if !valid && ext == "mkv" {
            if let Some(attachment) = output_streams
                .iter()
                .find(|s| cover(s) && s["codec_type"] == "attachment")
            {
                let extracted = temp.join("verified.jpg");
                let mut args = base();
                let media = actual
                    .iter()
                    .find(|stream| {
                        stream["codec_type"] == "video" || stream["codec_type"] == "audio"
                    })
                    .ok_or("No media streams.")?;
                args.extend([
                    format!("-dump_attachment:{}", attachment["index"]),
                    extracted.to_string_lossy().into_owned(),
                    "-i".into(),
                    replacement.to_string_lossy().into_owned(),
                    "-map".into(),
                    format!("0:{}", media["index"]),
                    "-t".into(),
                    "0".into(),
                    "-c".into(),
                    "copy".into(),
                    "-f".into(),
                    "null".into(),
                    "-".into(),
                ]);
                ffmpeg(tools, args, cancel).await?;
                valid = probe(tools, &extracted, cancel).await?["streams"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .any(|s| s["width"] == 3000 && s["height"] == 3000);
            }
        }
        if !valid {
            return Err("The embedded square cover could not be verified.".into());
        }
        let duration = |v: &Value| {
            v["format"]["duration"]
                .as_str()
                .and_then(|v| v.parse::<f64>().ok())
        };
        if let (Some(before), Some(after)) = (duration(&original), duration(&output)) {
            if (before - after).abs() > 1.0f64.max(before * 0.005) {
                return Err("Media duration changed.".into());
            }
        }
        let now = fs::symlink_metadata(file).map_err(|e| e.to_string())?;
        if cancel.cancelled() {
            return Err("Cancelled.".into());
        }
        if !now.is_file()
            || link_or_reparse(&now)
            || now.len() != original_stat.len()
            || now.modified().ok() != original_stat.modified().ok()
        {
            return Err("The source file changed during processing.".into());
        }
        fs::rename(replacement, file).map_err(|e| e.to_string())?;
        Ok(true)
    }
    .await;
    let _ = fs::remove_dir_all(&temp);
    result
}
pub struct Published {
    pub files: Vec<PathBuf>,
    pub warning: bool,
    pub retained_media: bool,
}
pub async fn publish(
    tools: &Tools,
    download: &Download,
    work: &Path,
    cancel: &Cancel,
) -> Result<Published> {
    let s = &download.settings;
    let destination = Path::new(s.text("downloadFolder"));
    fs::create_dir_all(destination).map_err(|error| error.to_string())?;
    let destination_folder = fs::canonicalize(destination).map_err(|error| error.to_string())?;
    let work_folder = fs::canonicalize(work).map_err(|error| error.to_string())?;
    if destination_folder.starts_with(work_folder) {
        return Err("The download folder cannot be inside the temporary work folder.".into());
    }
    let mut inspected = Vec::new();
    let candidates = files(work)?
        .into_iter()
        .filter(|file| is_media(file) && (s.flag("keepOriginal") || !partial(file)));
    let probes = stream::iter(candidates)
        .map(|file| async move {
            let size = fs::metadata(&file)
                .map_err(|error| error.to_string())?
                .len();
            if size < 1024 {
                return Ok(None);
            }
            let data = probe(tools, &file, cancel).await?;
            Ok::<_, String>(Some((file, size, data)))
        })
        .buffer_unordered(2);
    tokio::pin!(probes);
    let mut probe_failed = false;
    while let Some(result) = probes.next().await {
        if cancel.cancelled() {
            return Err("Cancelled.".into());
        }
        if let Ok(Some((file, size, data))) = result {
            let streams = data["streams"].as_array().unwrap();
            let audio = streams
                .iter()
                .any(|s| !cover(s) && s["codec_type"] == "audio");
            let video = streams
                .iter()
                .any(|s| !cover(s) && s["codec_type"] == "video");
            if audio || video {
                inspected.push((file, size, audio, video));
            }
        } else if result.is_err() {
            probe_failed = true;
        }
    }
    let audio = download.job["kind"] == "audio";
    let multiple =
        s.flag("playlist") || s.flag("keepOriginal") || (!audio && s.flag("splitChapters"));
    let merged = inspected.iter().any(|(_, _, a, v)| *a && *v);
    inspected.retain(|(_, _, a, v)| {
        if audio {
            *a
        } else {
            *v && (multiple || !merged || *a)
        }
    });
    if audio || !multiple {
        inspected.sort_by_key(|(_, size, _, _)| std::cmp::Reverse(*size));
    }
    if !multiple {
        inspected.truncate(1);
    }
    let mut published = Published {
        files: Vec::new(),
        warning: probe_failed,
        retained_media: probe_failed,
    };
    for (file, _, _, _) in inspected {
        let target = if s.flag("playlistFolder") {
            let relative = file
                .parent()
                .unwrap()
                .strip_prefix(work)
                .map_err(|error| error.to_string())?;
            destination.join(relative)
        } else {
            destination.to_path_buf()
        };
        match publish_with_sidecars(&file, &target, s.flag("forceOverwrites")) {
            Ok((saved, retained)) => {
                published.files.push(saved);
                published.warning |= retained;
                published.retained_media |= retained;
            }
            Err(_) => {
                published.warning = true;
                published.retained_media = true;
            }
        }
    }
    if published.files.is_empty() && published.warning {
        return Err("Files could not be saved to the destination folder.".into());
    }
    Ok(published)
}
fn is_sidecar(path: &Path) -> bool {
    path.file_name() != Some(OsStr::new("source-info.json"))
        && [
            "jpg",
            "jpeg",
            "png",
            "webp",
            "json",
            "description",
            "srt",
            "vtt",
            "ass",
            "lrc",
        ]
        .contains(&extension(path).as_str())
}

fn publish_with_sidecars(source: &Path, folder: &Path, overwrite: bool) -> Result<(PathBuf, bool)> {
    fs::create_dir_all(folder).map_err(|error| error.to_string())?;
    let name = source.file_name().ok_or("Invalid filename.")?;
    let saved = publish_file(source, folder, name, overwrite)?;
    let sidecars = (|| -> Result<()> {
        let original_stem = source
            .file_stem()
            .ok_or("Invalid filename.")?
            .to_string_lossy();
        let prefix = format!("{original_stem}.");
        let target_stem = saved.file_stem().ok_or("Invalid filename.")?;
        let parent = source.parent().ok_or("Missing source folder.")?;
        for entry in fs::read_dir(parent).map_err(|error| error.to_string())? {
            let entry = entry.map_err(|error| error.to_string())?;
            let path = entry.path();
            if !is_sidecar(&path) {
                continue;
            }
            let metadata = entry.metadata().map_err(|error| error.to_string())?;
            if !metadata.is_file() || link_or_reparse(&metadata) {
                continue;
            }
            let name = entry.file_name();
            if let Some(extension) = name.to_str().and_then(|name| name.strip_prefix(&prefix)) {
                let mut target_name = target_stem.to_os_string();
                target_name.push(".");
                target_name.push(extension);
                publish_file(&path, folder, &target_name, overwrite)?;
            }
        }
        Ok(())
    })();
    // Keep the original media with its sidecars if one of them failed to
    // publish, so the caller can recover the entire item.
    let retained = sidecars.is_err() || fs::remove_file(source).is_err();
    Ok((saved, retained))
}

fn publish_file(source: &Path, folder: &Path, name: &OsStr, overwrite: bool) -> Result<PathBuf> {
    let staged = folder.join(format!(".zenith-{}.tmp", Uuid::new_v4()));
    let result = (|| -> io::Result<PathBuf> {
        // Avoid duplicating large files on the same volume. Other volumes and
        // filesystems without hard links can use the staged copy.
        if fs::hard_link(source, &staged).is_err() {
            let mut input = fs::File::open(source)?;
            let mut output = fs::OpenOptions::new()
                .create_new(true)
                .write(true)
                .open(&staged)?;
            io::copy(&mut input, &mut output)?;
            output.flush()?;
            output.sync_all()?;
        }
        let mut index = 0u32;
        loop {
            let name = if index == 0 {
                name.to_owned()
            } else {
                let path = Path::new(name);
                let mut unique = OsString::from(path.file_stem().unwrap_or(name));
                unique.push(format!(" ({index})"));
                if let Some(extension) = path.extension() {
                    unique.push(".");
                    unique.push(extension);
                }
                unique
            };
            let target = folder.join(name);
            if overwrite {
                fs::rename(&staged, &target)?;
                return Ok(target);
            }
            match move_without_replace(&staged, &target) {
                Ok(()) => return Ok(target),
                Err(error) if error.kind() == io::ErrorKind::AlreadyExists || target.is_dir() => {
                    index = index
                        .checked_add(1)
                        .ok_or_else(|| io::Error::other("Too many duplicate files."))?
                }
                Err(error) => return Err(error),
            }
        }
    })();
    let _ = fs::remove_file(&staged);
    result.map_err(|e| e.to_string())
}
pub fn recover(tools: &Tools, work: &Path, id: &str) -> Option<PathBuf> {
    if !work.exists() {
        return None;
    }
    let media = match files(work) {
        Ok(files) => files
            .iter()
            .any(|file| is_media(file) || extension(file) == "part" || is_sidecar(file)),
        Err(_) => return Some(work.into()),
    };
    if !media && !work.join("failure.json").exists() {
        return None;
    }
    let target = tools.data.join("recovery").join(id);
    let _ = fs::create_dir_all(target.parent()?);
    if fs::rename(work, &target).is_ok() {
        Some(target)
    } else {
        Some(work.into())
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn publication_is_atomic_and_does_not_overwrite_by_default() {
        let root = tempfile::tempdir().unwrap();
        let dest = root.path().join("out");
        fs::create_dir(&dest).unwrap();
        fs::write(dest.join("video.mp4"), "original").unwrap();
        let source = root.path().join("input");
        fs::write(&source, "new media").unwrap();
        let saved = publish_file(&source, &dest, OsStr::new("video.mp4"), false).unwrap();
        assert_eq!(saved.file_name().unwrap(), "video (1).mp4");
        assert_eq!(fs::read(dest.join("video.mp4")).unwrap(), b"original");
        fs::write(&source, "replacement").unwrap();
        publish_file(&source, &dest, OsStr::new("video.mp4"), true).unwrap();
        assert_eq!(fs::read(dest.join("video.mp4")).unwrap(), b"replacement");
    }

    #[test]
    fn failed_sidecar_keeps_the_source_and_successful_media() {
        let root = tempfile::tempdir().unwrap();
        let dest = root.path().join("out");
        fs::create_dir_all(dest.join("video.srt")).unwrap();
        let source = root.path().join("video.mp4");
        let sidecar = root.path().join("video.srt");
        fs::write(&source, "video").unwrap();
        fs::write(&sidecar, "subtitle").unwrap();

        let (saved, retained) = publish_with_sidecars(&source, &dest, true).unwrap();
        assert!(retained);
        assert_eq!(fs::read(saved).unwrap(), b"video");
        assert_eq!(fs::read(source).unwrap(), b"video");
        assert_eq!(fs::read(sidecar).unwrap(), b"subtitle");
        assert!(dest.join("video.srt").is_dir());
    }
}
