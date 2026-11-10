use crate::settings::{Result, Settings, move_without_replace, naming, proxy, url};
use serde_json::{Value, json};
use std::{
    fs, io,
    path::{Path, PathBuf},
};
use uuid::Uuid;

#[derive(Clone)]
pub struct Tools {
    pub root: PathBuf,
    pub data: PathBuf,
}
impl Tools {
    pub fn get(&self, name: &str) -> Result<PathBuf> {
        if ![
            "yt-dlp.exe",
            "ffmpeg.exe",
            "ffprobe.exe",
            "aria2c.exe",
            "deno.exe",
        ]
        .contains(&name)
        {
            return Err("Unknown tool.".into());
        }
        let bundled = self.root.join("bin").join(name);
        let file = if name == "yt-dlp.exe" {
            let file = self.data.join("engine").join(name);
            if !file.exists() {
                fs::create_dir_all(file.parent().unwrap()).map_err(|e| e.to_string())?;
                let staged = file.with_extension(format!("{}.tmp", Uuid::new_v4()));
                let initialized = (|| -> io::Result<()> {
                    let mut source = fs::File::open(&bundled)?;
                    let mut output = fs::OpenOptions::new()
                        .write(true)
                        .create_new(true)
                        .open(&staged)?;
                    io::copy(&mut source, &mut output)?;
                    output.sync_all()?;
                    drop(output);
                    // A concurrent launch may have installed a newer engine.
                    match move_without_replace(&staged, &file) {
                        Err(error)
                            if error.kind() == io::ErrorKind::AlreadyExists && file.is_file() =>
                        {
                            Ok(())
                        }
                        result => result,
                    }
                })();
                let _ = fs::remove_file(&staged);
                initialized.map_err(|error| format!("Could not prepare {name}: {error}"))?;
            }
            file
        } else {
            bundled
        };
        if !file.is_file() {
            return Err(format!("{name} is missing from the application package."));
        }
        Ok(file)
    }
}
fn push(args: &mut Vec<String>, key: &str, value: impl ToString) {
    args.extend([key.into(), value.to_string()]);
}
pub fn base(settings: &Settings, tools: &Tools) -> Result<Vec<String>> {
    let mut args = vec![
        "--ignore-config".into(),
        "--encoding".into(),
        "utf-8".into(),
    ];
    push(
        &mut args,
        "--ffmpeg-location",
        tools.get("ffmpeg.exe")?.display(),
    );
    push(
        &mut args,
        "--js-runtimes",
        format!("deno:{}", tools.get("deno.exe")?.display()),
    );
    match settings.text("ipMode") {
        "ipv4" => args.push("--force-ipv4".into()),
        "ipv6" => args.push("--force-ipv6".into()),
        _ => {}
    }
    let proxy = proxy(settings.text("proxyUrl"))?;
    if !proxy.is_empty() {
        push(&mut args, "--proxy", proxy);
    }
    push(
        &mut args,
        "--socket-timeout",
        settings.number("socketTimeout"),
    );
    for (key, flag) in [
        ("userAgent", "--user-agent"),
        ("refererUrl", "--referer"),
        ("extractorArgs", "--extractor-args"),
    ] {
        if !settings.text(key).is_empty() {
            push(&mut args, flag, settings.text(key));
        }
    }
    push(
        &mut args,
        "--extractor-retries",
        settings.number("extractorRetries"),
    );
    if settings.number("sleepRequests") > 0 {
        push(
            &mut args,
            "--sleep-requests",
            settings.number("sleepRequests"),
        );
    }
    match settings.text("cookieMode") {
        "session" if tools.data.join("session-cookies.txt").is_file() => push(
            &mut args,
            "--cookies",
            tools.data.join("session-cookies.txt").display(),
        ),
        "browser" => push(
            &mut args,
            "--cookies-from-browser",
            settings.text("cookieBrowser"),
        ),
        _ => {}
    }
    Ok(args)
}
#[derive(Clone)]
pub struct Download {
    pub job: Value,
    pub settings: Settings,
}
impl Download {
    pub fn from_request(request: &Value, settings: &Settings) -> Result<Self> {
        if !request.is_object() {
            return Err("Invalid download request.".into());
        }
        let format = request["format"].as_str().unwrap_or("");
        if !format.is_empty()
            && !regex::Regex::new(r"^[a-zA-Z0-9_+./<>=*\[\]-]{1,300}$")
                .unwrap()
                .is_match(format)
        {
            return Err("Invalid format.".into());
        }
        let mut current = settings.clone();
        if let Some(playlist) = request["playlist"].as_bool() {
            current.set("playlist", json!(playlist));
        }
        if let Some(items) = request.get("playlistItems") {
            let items = items
                .as_str()
                .filter(|items| {
                    !items.is_empty()
                        && items.len() <= 1024
                        && items
                            .bytes()
                            .all(|byte| byte.is_ascii_digit() || b",:-".contains(&byte))
                })
                .ok_or("Invalid playlist items.")?;
            current.set("playlistItems", json!(items));
        }
        let trim = if request["trim"].is_object() {
            let start = request["trim"]["start"]
                .as_f64()
                .ok_or("Invalid trim start.")?;
            let end = if request["trim"]["end"].is_null() || request["trim"]["end"] == "" {
                None
            } else {
                Some(request["trim"]["end"].as_f64().ok_or("Invalid trim end.")?)
            };
            if !start.is_finite()
                || !(0.0..=604800.0).contains(&start)
                || end.is_some_and(|end| !end.is_finite() || end <= start || end > 604800.0)
            {
                return Err("Choose a valid start and end.".into());
            }
            json!({"start":start,"end":end})
        } else {
            Value::Null
        };
        let audio = request["audioFormat"]
            .as_str()
            .filter(|value| !value.is_empty())
            .unwrap_or("mp3");
        if !["mp3", "m4a", "opus", "flac", "wav", "aac", "vorbis", "alac"].contains(&audio) {
            return Err("Invalid audio format.".into());
        }
        let quality = request["videoQuality"]
            .as_u64()
            .or_else(|| request["videoQuality"].as_str()?.parse().ok())
            .unwrap_or(settings.number("videoQuality"))
            .clamp(144, 8640);
        let thumbnail = request["thumbnail"].as_str().unwrap_or("");
        let job = json!({
            "id":Uuid::new_v4().to_string(),"url":url(request["url"].as_str().ok_or("A URL is required.")?)?,
            "kind":if request["kind"]=="audio"{"audio"}else{"video"},"trim":trim,
            "title":request["title"].as_str().unwrap_or("Media").chars().take(300).collect::<String>(),
            "thumbnail":if thumbnail.starts_with("https://"){thumbnail.chars().take(2048).collect::<String>()}else{String::new()},
            "format":format,"formatExt":request["formatExt"].as_str().filter(|v|["mp4","webm","mkv"].contains(v)).unwrap_or(""),
            "audioFormat":audio,"videoQuality":quality,"playlist":current.flag("playlist"),
            "playlistItems":current.text("playlistItems"),"container":current.text("videoContainer")
        });
        Ok(Self {
            job,
            settings: current,
        })
    }
    pub fn key(&self) -> String {
        let fields = [
            "kind",
            "format",
            "audioFormat",
            "videoQuality",
            "trim",
            "playlist",
            "playlistItems",
            "container",
            "url",
        ];
        serde_json::to_string(&fields.map(|k| &self.job[k])).unwrap()
    }
    pub fn args(
        &self,
        tools: &Tools,
        work: &Path,
        native: bool,
        restart: bool,
        refresh: bool,
    ) -> Result<Vec<String>> {
        let s = &self.settings;
        let job = &self.job;
        let audio = job["kind"] == "audio";
        let mut args = crate::progress::args();
        args.extend(base(s, tools)?);
        push(&mut args, "--paths", work.display());
        push(&mut args, "--paths", format!("temp:{}", work.display()));
        let folder = if s.flag("playlist") && s.flag("playlistFolder") {
            work.join("%(playlist_title,playlist_id|Playlist)s")
        } else {
            work.to_path_buf()
        };
        let prefix = if s.flag("playlist") && s.flag("playlistNumber") {
            "%(playlist_index)03d - "
        } else {
            ""
        };
        push(
            &mut args,
            "-o",
            folder
                .join(format!("{prefix}{}", naming(s.text("naming"))?))
                .display(),
        );
        for (key, flag) in [
            ("retries", "--retries"),
            ("fragmentRetries", "--fragment-retries"),
            ("fileAccessRetries", "--file-access-retries"),
            ("concurrentFragments", "--concurrent-fragments"),
        ] {
            push(&mut args, flag, s.number(key));
        }
        if s.flag("useAria2") && !native {
            push(
                &mut args,
                "--downloader",
                format!("http,ftp:{}", tools.get("aria2c.exe")?.display()),
            );
            push(&mut args, "--downloader", "dash,m3u8:native");
            let n = s.number("aria2Connections");
            push(
                &mut args,
                "--downloader-args",
                format!(
                    "aria2c:-x {n} -s {n} -j 1 --file-allocation=none --summary-interval=1 --connect-timeout=20 --timeout=30 --max-tries=3"
                ),
            );
        }
        args.push(
            if s.flag("playlist") {
                "--yes-playlist"
            } else {
                "--no-playlist"
            }
            .into(),
        );
        args.push("--windows-filenames".into());
        args.push(
            if s.text("unavailableFragments") == "abort" {
                "--abort-on-unavailable-fragments"
            } else {
                "--skip-unavailable-fragments"
            }
            .into(),
        );
        for (key, flag) in [
            ("keepFragments", "--keep-fragments"),
            ("restrictFilenames", "--restrict-filenames"),
            ("forceOverwrites", "--force-overwrites"),
            ("keepOriginal", "--keep-video"),
            ("writeInfoJson", "--write-info-json"),
            ("writeDescription", "--write-description"),
        ] {
            if s.flag(key) {
                args.push(flag.into());
            }
        }
        for (key, flag) in [
            ("speedLimit", "--limit-rate"),
            ("throttleRate", "--throttled-rate"),
            ("formatSort", "--format-sort"),
        ] {
            if !s.text(key).is_empty() {
                push(&mut args, flag, s.text(key));
            }
        }
        if s.flag("playlist") {
            if !s.text("playlistItems").is_empty() {
                push(&mut args, "--playlist-items", s.text("playlistItems"));
            }
            for (key, flag) in [
                ("playlistReverse", "--playlist-reverse"),
                ("playlistRandom", "--playlist-random"),
                ("lazyPlaylist", "--lazy-playlist"),
                ("breakOnExisting", "--break-on-existing"),
            ] {
                if s.flag(key) {
                    args.push(flag.into());
                }
            }
            args.push(
                if s.text("playlistPolicy") == "continue" {
                    "--ignore-errors"
                } else {
                    "--abort-on-error"
                }
                .into(),
            );
            if s.text("concatPlaylist") != "never" {
                push(&mut args, "--concat-playlist", s.text("concatPlaylist"));
                push(
                    &mut args,
                    "-o",
                    "pl_video:%(playlist_title,playlist_id|Playlist)s.%(ext)s",
                );
            }
        }
        for (key, flag) in [
            ("sleepInterval", "--sleep-interval"),
            ("sleepSubtitles", "--sleep-subtitles"),
        ] {
            if s.number(key) > 0 {
                push(&mut args, flag, s.number(key));
            }
        }
        if s.number("maxSleepInterval") > 0 && s.number("sleepInterval") > 0 {
            push(
                &mut args,
                "--max-sleep-interval",
                s.number("maxSleepInterval"),
            );
        }
        push(&mut args, "--fixup", s.text("fixupPolicy"));
        if s.flag("writeThumbnail") {
            args.extend([
                "--write-thumbnail".into(),
                "--convert-thumbnails".into(),
                "jpg".into(),
            ]);
        }
        if s.flag("splitChapters") && !audio && job["trim"].is_null() {
            args.push("--split-chapters".into());
            push(&mut args, "--paths", format!("chapter:{}", work.display()));
            push(
                &mut args,
                "-o",
                "chapter:%(title)s - %(section_number)03d %(section_title)s.%(ext)s",
            );
        }
        if !job["trim"].is_null() {
            let start = job["trim"]["start"].as_f64().unwrap();
            let end = job["trim"]["end"]
                .as_f64()
                .map(|v| v.to_string())
                .unwrap_or("inf".into());
            push(&mut args, "--download-sections", format!("*{start}-{end}"));
            if s.flag("accurateTrim") {
                args.push("--force-keyframes-at-cuts".into());
            }
        }
        let container = if !s.text("recodeVideo").is_empty() {
            s.text("recodeVideo")
        } else if !s.text("remuxVideo").is_empty() {
            s.text("remuxVideo")
        } else {
            s.text("videoContainer")
        };
        if audio {
            args.extend(["-f".into(), "bestaudio/best".into(), "-x".into()]);
            push(
                &mut args,
                "--audio-format",
                job["audioFormat"].as_str().unwrap(),
            );
            push(
                &mut args,
                "--audio-quality",
                format!("{}K", s.number("audioQuality")),
            );
        } else {
            let height = job["videoQuality"].as_u64().unwrap();
            let cap = if height >= 8640 {
                String::new()
            } else {
                format!("[height<=?{height}]")
            };
            let compatible = if container == "webm" {
                format!("bv*{cap}[ext=webm]+ba[ext=webm]/bv*{cap}+ba/b{cap}")
            } else {
                format!("bv*{cap}[ext=mp4]+ba[ext=m4a]/b{cap}[ext=mp4]/bv*{cap}+ba/b{cap}")
            };
            let format = job["format"].as_str().unwrap();
            push(
                &mut args,
                "-f",
                if s.flag("playlist") || format.is_empty() {
                    compatible.as_str()
                } else {
                    format
                },
            );
            let merge = if container == "webm" && job["formatExt"] != "webm" {
                "mkv"
            } else if ["mp4", "mkv", "webm"].contains(&container) {
                container
            } else {
                "mkv"
            };
            push(&mut args, "--merge-output-format", merge);
            push(
                &mut args,
                if !s.text("recodeVideo").is_empty()
                    || (s.text("remuxVideo").is_empty()
                        && ["avi", "flv", "webm"].contains(&container))
                {
                    "--recode-video"
                } else {
                    "--remux-video"
                },
                container,
            );
        }
        if s.flag("embedMetadata") {
            args.push("--embed-metadata".into());
        }
        if s.flag("embedChapters") && (audio || ["mp4", "mkv", "webm", "mov"].contains(&container))
        {
            args.push("--embed-chapters".into());
        }
        if s.flag("embedThumbnail") {
            args.extend([
                "--convert-thumbnails".into(),
                "jpg".into(),
                "--write-thumbnail".into(),
            ]);
            let can_embed = if audio {
                ["mp3", "m4a", "opus", "flac", "vorbis", "alac"]
                    .contains(&job["audioFormat"].as_str().unwrap())
            } else {
                ["mp4", "mkv", "mov"].contains(&container)
            };
            if can_embed {
                args.push("--embed-thumbnail".into());
            }
        }
        if s.flag("subtitles") && !audio {
            let languages = s.text("subtitleLang");
            args.push("--write-subs".into());
            push(
                &mut args,
                "--sub-langs",
                if languages.is_empty() {
                    "tr,en"
                } else {
                    languages
                },
            );
            if s.flag("autoSubtitles") {
                args.push("--write-auto-subs".into());
            }
            if s.flag("embedSubtitles") && ["mp4", "mkv", "webm", "mov"].contains(&container) {
                args.push("--embed-subs".into());
            }
            if s.text("subtitleFormat") != "best" {
                push(&mut args, "--convert-subs", s.text("subtitleFormat"));
            }
        }
        if s.flag("sponsorBlock") && !audio {
            push(&mut args, "--sponsorblock-api", s.text("sponsorApi"));
            let categories = s.text("sponsorCategories");
            push(
                &mut args,
                if s.text("sponsorAction") == "mark" {
                    "--sponsorblock-mark"
                } else {
                    "--sponsorblock-remove"
                },
                if categories.is_empty() {
                    "sponsor,selfpromo,interaction"
                } else {
                    categories
                },
            );
            if !s.text("sponsorMarkCategories").is_empty() && s.text("sponsorAction") != "mark" {
                push(
                    &mut args,
                    "--sponsorblock-mark",
                    s.text("sponsorMarkCategories"),
                );
            }
        }
        if s.flag("downloadArchive") && job["trim"].is_null() && !s.flag("forceOverwrites") {
            push(
                &mut args,
                "--download-archive",
                tools.data.join("download-archive.txt").display(),
            );
        }
        if refresh {
            args.push("--check-formats".into());
        }
        if restart {
            args.extend([
                "--no-continue".into(),
                "--http-chunk-size".into(),
                "1M".into(),
            ]);
        }
        args.push(job["url"].as_str().unwrap().into());
        Ok(args)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preserves_legacy_playlist_and_optional_argument_behavior() {
        let temp = tempfile::tempdir().unwrap();
        let tools = Tools {
            root: temp.path().into(),
            data: temp.path().join("data"),
        };
        fs::create_dir(tools.root.join("bin")).unwrap();
        for name in ["ffmpeg.exe", "deno.exe"] {
            fs::write(tools.root.join("bin").join(name), []).unwrap();
        }
        let mut settings = Settings::defaults();
        settings.set("downloadFolder", json!(temp.path().join("downloads")));
        settings.set("subtitles", json!(true));
        settings.set("subtitleLang", json!(""));
        settings.set("sponsorBlock", json!(true));
        settings.set("sponsorCategories", json!(""));
        let request =
            json!({"url": "https://example.com/video", "playlist": true, "playlistItems": "1,3-5"});
        let job = Download::from_request(&request, &settings).unwrap();
        let args = job
            .args(&tools, &temp.path().join("work"), false, false, false)
            .unwrap();
        for pair in [
            ["--playlist-items", "1,3-5"],
            ["--sub-langs", "tr,en"],
            ["--sponsorblock-remove", "sponsor,selfpromo,interaction"],
        ] {
            assert!(args.windows(2).any(|items| items == pair));
        }
        assert!(args.contains(&"--yes-playlist".into()));
        assert_eq!(args.last().unwrap(), "https://example.com/video");
        assert!(
            Download::from_request(
                &json!({"url": "https://example.com/video", "playlistItems": ""}),
                &settings
            )
            .is_err()
        );
    }

    #[test]
    fn tool_initialization_does_not_replace_the_installed_engine() {
        let temp = tempfile::tempdir().unwrap();
        let tools = Tools {
            root: temp.path().into(),
            data: temp.path().join("data"),
        };
        let bundle = tools.root.join("bin/yt-dlp.exe");
        fs::create_dir(bundle.parent().unwrap()).unwrap();
        fs::write(&bundle, "bundled").unwrap();
        let installed = tools.get("yt-dlp.exe").unwrap();
        assert_ne!(installed, bundle);
        assert_eq!(fs::read(&installed).unwrap(), b"bundled");
        fs::write(&installed, "updated").unwrap();
        assert_eq!(tools.get("yt-dlp.exe").unwrap(), installed);
        assert_eq!(fs::read(&installed).unwrap(), b"updated");
    }
}
