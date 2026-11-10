use regex::Regex;
use serde_json::{Value, json};
use std::sync::LazyLock;

static LEGACY_FORMATS: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)^\[info\].*Downloading \d+ format\(s\):\s+(\S+)").unwrap());
static LEGACY_PROGRESS: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)^\[download\]\s+(\d+(?:\.\d+)?)%").unwrap());

pub fn args() -> Vec<String> {
    ["--newline","--progress","--progress-delta","0.25","--no-simulate",
    "--print","before_dl:ZENITH_MEDIA:%(.{id,title,format_id,filesize,filesize_approx,playlist_index,playlist_count,section_start,section_end})j\t%(requested_formats.:.{format_id,filesize,filesize_approx})j",
    "--progress-template","download:ZENITH_PROGRESS:%(progress.{status,downloaded_bytes,total_bytes,total_bytes_estimate,speed,eta})j\t%(info.{id,format_id})j","--no-quiet"].map(String::from).to_vec()
}
fn positive(value: &Value) -> Option<f64> {
    value.as_f64().filter(|n| n.is_finite() && *n > 0.0)
}
fn nonnegative(value: &Value) -> Option<f64> {
    value.as_f64().filter(|n| n.is_finite() && *n >= 0.0)
}
fn text(value: &Value) -> String {
    value.as_str().unwrap_or("").chars().take(300).collect()
}
fn counter(value: &Value) -> Option<u64> {
    value
        .as_u64()
        .filter(|value| (1..=9_007_199_254_740_991).contains(value))
}
fn fields(frame: &str) -> Option<(Value, Value)> {
    let (first, second) = frame.split_once('\t').unwrap_or((frame, "NA"));
    let decode = |field| {
        if field == "NA" {
            Some(Value::Null)
        } else {
            serde_json::from_str(field).ok()
        }
    };
    Some((decode(first)?, decode(second)?))
}
#[derive(Default)]
struct Stream {
    id: String,
    size: Option<f64>,
    estimate: Option<f64>,
    downloaded: f64,
    finished: bool,
}
impl Stream {
    fn new(value: &Value) -> Self {
        Self {
            id: text(&value["format_id"]),
            size: positive(&value["filesize"]),
            estimate: positive(&value["filesize_approx"]),
            ..Self::default()
        }
    }
}
#[derive(Default)]
pub struct Tracker {
    media_id: String,
    streams: Vec<Stream>,
    index: usize,
    count: usize,
    item_index: Option<u64>,
    item_count: Option<u64>,
    structured: bool,
}
impl Tracker {
    fn processing(&self, stage: &str, detail: &str) -> Value {
        json!({"phase":"processing","stage":stage,"percent":null,"downloadedBytes":null,"totalBytes":null,"speed":null,"eta":null,
        "estimated":false,"percentScope":null,"etaScope":null,"itemIndex":self.item_index,"itemCount":self.item_count,
        "streamIndex":self.index.max(1),"streamCount":self.streams.len().max(self.count).max(1),"detail":detail})
    }
    pub fn line(&mut self, raw: &str) -> Option<Value> {
        let line = raw.trim();
        if line.len() > 32768 {
            return None;
        }
        if let Some(frame) = line.strip_prefix("ZENITH_MEDIA:") {
            let (info, selected) = fields(frame)?;
            if !info.is_object() {
                return None;
            }
            self.media_id = text(&info["id"]);
            self.item_index = counter(&info["playlist_index"]);
            self.item_count = counter(&info["playlist_count"]);
            self.streams = selected
                .as_array()
                .into_iter()
                .flatten()
                .filter(|value| value.is_object())
                .take(64)
                .map(Stream::new)
                .collect();
            if self.streams.is_empty() {
                self.streams.push(Stream::new(&info));
            }
            if nonnegative(&info["section_start"]).is_some()
                || positive(&info["section_end"]).is_some()
            {
                for stream in &mut self.streams {
                    stream.size = None;
                    stream.estimate = None;
                }
            }
            self.index = 0;
            self.count = self.streams.len();
            self.structured = true;
            let total = self.streams.iter().map(|s| s.size).sum::<Option<f64>>();
            return Some(
                json!({"phase":"downloading","stage":"download","percent":0,"title":text(&info["title"]),
            "downloadedBytes":0,"totalBytes":total,"speed":null,"eta":null,"estimated":false,
            "percentScope":if total.is_some(){"download"}else{"stream"},"etaScope":null,
            "itemIndex":self.item_index,"itemCount":self.item_count,"streamIndex":1,"streamCount":self.count,"detail":"İndiriliyor…"}),
            );
        }
        if let Some(frame) = line.strip_prefix("ZENITH_PROGRESS:") {
            let (progress, info) = fields(frame)?;
            let finished = progress["status"] == "finished";
            if !finished && progress["status"] != "downloading" {
                return None;
            }
            let next = text(&info["id"]);
            if !next.is_empty() && !self.media_id.is_empty() && next != self.media_id {
                self.streams.clear();
                self.index = 0;
                self.count = 1;
                self.item_index = None;
                self.item_count = None;
            }
            if !next.is_empty() {
                self.media_id = next;
            }
            self.structured = true;
            let id = text(&info["format_id"]);
            let ids: Vec<_> = id.split('+').collect();
            if self.streams.len() > 1
                && ids.len() == self.streams.len()
                && self.streams.iter().all(|s| ids.contains(&s.id.as_str()))
            {
                self.streams = vec![Stream {
                    id: id.clone(),
                    size: self.streams.iter().map(|s| s.size).sum(),
                    estimate: self.streams.iter().map(|s| s.size.or(s.estimate)).sum(),
                    ..Stream::default()
                }];
                self.count = 1;
            }
            let index = self
                .streams
                .iter()
                .position(|s| !id.is_empty() && s.id == id)
                .or_else(|| (self.streams.len() == 1 && self.streams[0].id.is_empty()).then_some(0))
                .or_else(|| {
                    (id.is_empty() && !self.streams.is_empty()).then(|| {
                        self.streams
                            .iter()
                            .position(|stream| !stream.finished)
                            .unwrap_or(0)
                    })
                });
            let index = match index {
                Some(i) => i,
                None => {
                    if self.streams.len() >= 64 {
                        return None;
                    }
                    self.streams.push(Stream::new(&info));
                    self.streams.len() - 1
                }
            };
            self.index = index + 1;
            let stream = &mut self.streams[index];
            let downloaded = nonnegative(&progress["downloaded_bytes"]);
            if let Some(bytes) = downloaded {
                stream.downloaded = bytes;
            }
            if let Some(total) = positive(&progress["total_bytes"]) {
                stream.size = Some(total);
            }
            if let Some(total) = positive(&progress["total_bytes_estimate"]) {
                stream.estimate = Some(total);
            }
            stream.finished = finished;
            if finished {
                if stream.size.is_none() {
                    stream.size = downloaded.filter(|bytes| *bytes > 0.0);
                }
                if let Some(size) = stream.size {
                    stream.downloaded = size;
                }
            }
            if self.streams.iter().all(|s| s.finished) {
                return Some(self.processing("finalize", "Son işlemler yapılıyor…"));
            }
            let stream = &self.streams[index];
            let known = self.streams.iter().all(|s| s.size.is_some());
            let total = if known {
                Some(self.streams.iter().map(|s| s.size.unwrap()).sum::<f64>())
            } else {
                stream.size.or(stream.estimate)
            };
            let downloaded = if known {
                self.streams
                    .iter()
                    .map(|s| s.downloaded.min(s.size.unwrap()))
                    .sum::<f64>()
            } else {
                stream.downloaded
            };
            let speed = if finished {
                None
            } else {
                positive(&progress["speed"])
            };
            let eta = if finished {
                None
            } else if known && speed.is_some() {
                total.map(|t| (t - downloaded).max(0.0) / speed.unwrap())
            } else {
                nonnegative(&progress["eta"])
            };
            return Some(
                json!({"phase":"downloading","stage":"download","percent":total.map(|t|(downloaded*100.0/t).clamp(0.0,99.0)),
            "downloadedBytes":downloaded,"totalBytes":total,"speed":speed,"eta":eta,"estimated":!known&&stream.size.is_none()&&stream.estimate.is_some(),
            "percentScope":if known{"download"}else{"stream"},"etaScope":eta.map(|_|if known{"transfer"}else{"stream"}),
            "itemIndex":self.item_index,"itemCount":self.item_count,"streamIndex":self.index,"streamCount":self.streams.len().max(self.count),"detail":"İndiriliyor…"}),
            );
        }
        if !self.structured {
            if let Some(capture) = LEGACY_FORMATS.captures(line) {
                self.count = capture[1].split('+').count();
            }
            if line
                .get(..23)
                .is_some_and(|prefix| prefix.eq_ignore_ascii_case("[download] Destination:"))
            {
                self.index += 1;
            }
            if let Some(percent) = LEGACY_PROGRESS
                .captures(line)
                .and_then(|capture| capture[1].parse::<f64>().ok())
                .filter(|percent| percent.is_finite())
            {
                let mut frame = self.processing("download", "İndiriliyor…");
                frame["phase"] = json!("downloading");
                frame["percent"] = json!(percent.clamp(0.0, 99.0));
                frame["percentScope"] = json!("stream");
                frame["streamIndex"] = json!(self.index.clamp(1, self.count.max(1)));
                return Some(frame);
            }
        }
        if let Some(name) = line
            .strip_prefix('[')
            .and_then(|line| line.split_once(']'))
            .map(|(name, _)| name.to_ascii_lowercase())
        {
            match name.as_str() {
                "merger" => return Some(self.processing("merge", "Video ve ses birleştiriliyor…")),
                "videoremuxer" => {
                    return Some(self.processing("remux", "Dosya biçimi hazırlanıyor…"));
                }
                "metadata"
                | "modifychapters"
                | "thumbnailsconvertor"
                | "embedthumbnail"
                | "embedsubtitle"
                | "extractaudio"
                | "splitchapters" => {
                    return Some(self.processing("postprocess", "Son işlemler yapılıyor…"));
                }
                _ => {}
            }
        }
        None
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn aggregates_streams_and_keeps_processing_below_completion() {
        let mut tracker = Tracker::default();
        tracker.line(r#"ZENITH_MEDIA:{"id":"x","title":"Example"}	[{"format_id":"v","filesize":900},{"format_id":"a","filesize":100}]"#).unwrap();
        let event=tracker.line(r#"ZENITH_PROGRESS:{"status":"finished","downloaded_bytes":900,"total_bytes":900}	{"id":"x","format_id":"v"}"#).unwrap();
        assert_eq!(event["percent"], 90.0);
        let event=tracker.line(r#"ZENITH_PROGRESS:{"status":"finished","downloaded_bytes":100,"total_bytes":100}	{"id":"x","format_id":"a"}"#).unwrap();
        assert_eq!(event["phase"], "processing");
        assert!(event["percent"].is_null());
        let event=tracker.line(r#"ZENITH_PROGRESS:{"status":"downloading","downloaded_bytes":10,"total_bytes":100}	{"id":"next","format_id":"v"}"#).unwrap();
        assert_eq!(event["percent"], 10.0);
    }

    #[test]
    fn legacy_progress_tracks_both_streams_without_a_guessed_eta() {
        let mut tracker = Tracker::default();
        assert!(
            tracker
                .line("[info] v: Downloading 2 format(s): v+a")
                .is_none()
        );
        assert!(tracker.line("[download] Destination: video.mp4").is_none());
        let video = tracker.line("[download] 100% of 9MiB").unwrap();
        assert_eq!(video["percent"], 99.0);
        assert_eq!(video["streamIndex"], 1);
        assert_eq!(video["streamCount"], 2);
        assert!(tracker.line("[download] Destination: audio.m4a").is_none());
        let audio = tracker.line("[download] 7.5% of 1MiB ETA 00:30").unwrap();
        assert_eq!(audio["percent"], 7.5);
        assert_eq!(audio["streamIndex"], 2);
        assert_eq!(audio["streamCount"], 2);
        assert!(audio["eta"].is_null());
        assert!(tracker.line("[download] 12").is_none());
        assert_eq!(
            tracker.line("[merger] Saving").unwrap()["phase"],
            "processing"
        );
    }

    #[test]
    fn structured_media_with_no_valid_requested_formats_uses_the_source_stream() {
        let mut tracker = Tracker::default();
        let source = tracker
            .line("ZENITH_MEDIA:{\"id\":\"x\",\"format_id\":\"single\",\"filesize\":200}\t[null]")
            .unwrap();
        assert_eq!(source["streamCount"], 1);
        assert_eq!(source["totalBytes"], 200.0);
        let progress = tracker
            .line("ZENITH_PROGRESS:{\"status\":\"downloading\",\"downloaded_bytes\":100}\tNA")
            .unwrap();
        assert_eq!(progress["percent"], 50.0);
    }
}
