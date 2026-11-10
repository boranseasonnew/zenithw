use serde::{Deserialize, Serialize};
use std::cmp::Ordering;

#[derive(Debug, Deserialize)]
pub struct SourceFormat {
    format_id: String,
    protocol: Option<String>,
    vcodec: Option<String>,
    acodec: Option<String>,
    ext: Option<String>,
    height: Option<f64>,
    fps: Option<f64>,
    tbr: Option<f64>,
    language_preference: Option<f64>,
    filesize: Option<f64>,
    filesize_approx: Option<f64>,
}

impl SourceFormat {
    fn direct(&self) -> bool {
        self.protocol.as_deref() == Some("https")
    }
}

#[derive(Debug, PartialEq, Serialize)]
pub struct VideoChoice {
    pub id: String,
    pub height: u32,
    pub ext: Option<String>,
    pub fps: Option<f64>,
    pub codec: Option<String>,
    pub size: u64,
}

fn preferred_codec(format: &SourceFormat, preference: &str) -> bool {
    let codec = format
        .vcodec
        .as_deref()
        .unwrap_or_default()
        .to_ascii_lowercase();
    let prefixes: &[&str] = match preference {
        "h264" => &["avc1", "h264"],
        "av1" => &["av01", "av1"],
        "vp9" => &["vp9", "vp09"],
        _ => &[],
    };
    prefixes.iter().any(|prefix| codec.starts_with(prefix))
}

fn has_avc_profile(format: &SourceFormat) -> bool {
    format
        .vcodec
        .as_deref()
        .unwrap_or_default()
        .to_ascii_lowercase()
        .starts_with("avc1.")
}

fn descending(a: Option<f64>, b: Option<f64>) -> Ordering {
    b.unwrap_or_default()
        .partial_cmp(&a.unwrap_or_default())
        .unwrap_or(Ordering::Equal)
}

fn audio_for<'a>(formats: &'a [SourceFormat], extension: Option<&str>) -> Option<&'a SourceFormat> {
    let webm = extension == Some("webm");
    formats
        .iter()
        .filter(|format| {
            let ext = format.ext.as_deref();
            format.vcodec.as_deref() == Some("none")
                && format.acodec.as_deref() != Some("none")
                && !format.format_id.to_ascii_lowercase().ends_with("-drc")
                && if webm {
                    ext == Some("webm")
                } else {
                    matches!(ext, Some("m4a" | "mp4"))
                }
        })
        .min_by(|a, b| {
            b.direct()
                .cmp(&a.direct())
                .then_with(|| {
                    (b.ext.as_deref() == Some("m4a")).cmp(&(a.ext.as_deref() == Some("m4a")))
                })
                .then_with(|| descending(a.language_preference, b.language_preference))
                .then_with(|| descending(a.tbr, b.tbr))
        })
}

pub fn video_choices(formats: &[SourceFormat], container: &str, codec: &str) -> Vec<VideoChoice> {
    let container = match container {
        "mov" | "avi" | "flv" => "mp4",
        other => other,
    };
    let mut videos: Vec<_> = formats
        .iter()
        .filter(|format| {
            format
                .height
                .is_some_and(|height| (1.0..=f64::from(u32::MAX)).contains(&height))
                && format.vcodec.as_deref() != Some("none")
        })
        .collect();
    if matches!(container, "mp4" | "webm")
        && videos
            .iter()
            .any(|video| video.ext.as_deref() == Some(container))
    {
        videos.retain(|video| video.ext.as_deref() == Some(container));
    }
    videos.sort_by(|a, b| {
        descending(a.height, b.height)
            .then_with(|| descending(a.fps, b.fps))
            .then_with(|| preferred_codec(b, codec).cmp(&preferred_codec(a, codec)))
            .then_with(|| b.direct().cmp(&a.direct()))
            .then_with(|| has_avc_profile(b).cmp(&has_avc_profile(a)))
    });

    let mut choices: Vec<VideoChoice> = Vec::new();
    for video in videos {
        let height = video
            .height
            .expect("video candidates have a positive height")
            .round() as u32;
        if choices.iter().any(|choice| {
            choice.height == height && choice.ext == video.ext && choice.fps == video.fps
        }) {
            continue;
        }
        let id = match video.acodec.as_deref() {
            Some(codec) if !codec.is_empty() && codec != "none" => video.format_id.clone(),
            _ => {
                let audio = audio_for(formats, video.ext.as_deref())
                    .map(|audio| audio.format_id.as_str())
                    .filter(|id| !id.is_empty())
                    .unwrap_or("bestaudio");
                format!("{}+{audio}/best", video.format_id)
            }
        };
        choices.push(VideoChoice {
            id,
            height,
            ext: video.ext.clone(),
            fps: video.fps,
            codec: video.vcodec.clone(),
            size: video
                .filesize
                .filter(|size| *size > 0.0)
                .or(video.filesize_approx.filter(|size| *size > 0.0))
                .unwrap_or_default()
                .round() as u64,
        });
        if choices.len() == 12 {
            break;
        }
    }
    choices
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preserves_container_codec_preference_and_separate_audio_selection() {
        let formats: Vec<SourceFormat> = serde_json::from_str(
            r#"[
                {"format_id":"av1","ext":"mp4","height":1080,"fps":60,"vcodec":"av01","acodec":"none"},
                {"format_id":"h264","ext":"mp4","height":1080,"fps":60,"vcodec":"avc1.640028","acodec":"none","filesize_approx":42},
                {"format_id":"vp9","ext":"webm","height":1440,"fps":60,"vcodec":"vp9","acodec":"opus"},
                {"format_id":"audio-drc","ext":"m4a","vcodec":"none","acodec":"aac","protocol":"https","tbr":999},
                {"format_id":"audio-manifest","ext":"m4a","vcodec":"none","acodec":"aac","protocol":"m3u8","tbr":320},
                {"format_id":"audio","ext":"m4a","vcodec":"none","acodec":"aac","protocol":"https","tbr":160}
            ]"#,
        )
        .unwrap();
        let choices = video_choices(&formats, "mov", "h264");
        assert_eq!(choices.len(), 1);
        assert_eq!(choices[0].id, "h264+audio/best");
        assert_eq!(choices[0].size, 42);
        assert_eq!(
            video_choices(&formats, "mp4", "av1")[0].id,
            "av1+audio/best"
        );
        assert_eq!(video_choices(&formats, "webm", "av1")[0].id, "vp9");
        assert_eq!(video_choices(&formats, "mkv", "av1")[0].height, 1440);
    }

    #[test]
    fn falls_back_to_available_containers_and_caps_the_menu() {
        let formats: Vec<_> = (1..20)
            .map(|height| serde_json::from_value(serde_json::json!({
                "format_id": format!("fmt-{height}"), "height": height, "ext": "webm", "vcodec": "vp9"
            })).unwrap())
            .collect();
        let choices = video_choices(&formats, "mp4", "h264");
        assert_eq!(choices.len(), 12);
        assert_eq!(choices[0].id, "fmt-19+bestaudio/best");
        assert_eq!(choices[11].height, 8);
    }

    #[test]
    fn accepts_floating_point_metadata_numbers_from_extractors() {
        let formats: Vec<SourceFormat> = serde_json::from_str(
            r#"[{"format_id":"av","ext":"mp4","height":720.0,"fps":29.97,"vcodec":"avc1","acodec":"aac","filesize_approx":1023.75}]"#,
        ).unwrap();
        let choice = &video_choices(&formats, "mp4", "h264")[0];
        assert_eq!(choice.height, 720);
        assert_eq!(choice.fps, Some(29.97));
        assert_eq!(choice.size, 1024);
    }
}
