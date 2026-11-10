use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{
    fs,
    io::{self, Read, Write},
    path::{Path, PathBuf},
};
use uuid::Uuid;

pub type Result<T> = std::result::Result<T, String>;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Settings(pub Value);

impl Settings {
    pub fn text(&self, key: &str) -> &str {
        self.0[key].as_str().unwrap_or("")
    }
    pub fn flag(&self, key: &str) -> bool {
        self.0[key].as_bool().unwrap_or(false)
    }
    pub fn number(&self, key: &str) -> u64 {
        self.0[key]
            .as_u64()
            .or_else(|| self.0[key].as_str()?.parse().ok())
            .unwrap_or(0)
    }
    pub fn set(&mut self, key: &str, value: Value) {
        self.0[key] = value;
    }
    pub fn defaults() -> Self {
        Self(serde_json::from_str(include_str!("../defaults.json")).unwrap())
    }
    pub fn validate(&self, next: &Value) -> Result<Self> {
        let entries = next.as_object().ok_or("Invalid settings.")?;
        let defaults = Self::defaults();
        let rules: Value = serde_json::from_str(include_str!("../settings-rules.json")).unwrap();
        let mut merged = self.clone();
        for (key, value) in entries {
            if defaults.0.get(key).is_none() || key == "settingsVersion" {
                continue;
            }
            let clean = if let Some(values) = rules["enums"][key].as_array() {
                if !values.contains(value) {
                    return Err(format!("Invalid {key}."));
                }
                value.clone()
            } else if let Some(limits) = rules["numbers"][key].as_array() {
                let number = value
                    .as_i64()
                    .or_else(|| value.as_str()?.parse().ok())
                    .unwrap_or(defaults.number(key) as i64);
                json!(number.clamp(limits[0].as_i64().unwrap(), limits[1].as_i64().unwrap()))
            } else if defaults.0[key].is_boolean() {
                json!(value.as_bool().ok_or_else(|| format!("Invalid {key}."))?)
            } else {
                let text = value.as_str().ok_or_else(|| format!("Invalid {key}."))?;
                if text.encode_utf16().count() > 1024
                    || text.chars().any(|c| matches!(c, '\r' | '\n' | '\0'))
                {
                    return Err(format!("Invalid {key}."));
                }
                json!(text.trim())
            };
            merged.set(key, clean);
        }
        let folder = merged.text("downloadFolder");
        if !Path::new(folder).is_absolute() {
            return Err("Choose an absolute download folder.".into());
        }
        naming(merged.text("naming"))?;
        proxy(merged.text("proxyUrl"))?;
        for key in ["speedLimit", "throttleRate"] {
            check_pattern(
                merged.text(key),
                r"(?i)^[0-9]+(?:\.[0-9]+)?[KMGTP]?$",
                "Use a rate such as 800K or 5M.",
            )?;
        }
        check_pattern(
            merged.text("playlistItems"),
            r"^[0-9,:-]+$",
            "Playlist selection: 1,3,5-10",
        )?;
        check_pattern(
            merged.text("subtitleLang"),
            r"^[a-zA-Z0-9,*._-]+$",
            "Invalid subtitle languages.",
        )?;
        check_pattern(
            merged.text("extractorArgs"),
            r"^[a-zA-Z0-9_.-]+:.+$",
            "Use extractor:option=value.",
        )?;
        for key in ["sponsorCategories", "sponsorMarkCategories"] {
            if !merged.text(key).is_empty()
                && !merged.text(key).split(',').all(|v| {
                    [
                        "sponsor",
                        "intro",
                        "outro",
                        "selfpromo",
                        "preview",
                        "filler",
                        "interaction",
                        "music_offtopic",
                    ]
                    .contains(&v.trim())
                })
            {
                return Err("Invalid SponsorBlock categories.".into());
            }
        }
        for key in ["cookieLoginUrl", "sponsorApi", "refererUrl"] {
            if !merged.text(key).is_empty() {
                let url = url(merged.text(key))?;
                if key != "refererUrl" && !url.starts_with("https://") {
                    return Err("HTTPS is required.".into());
                }
                merged.set(key, json!(url));
            }
        }
        if !merged.text("remuxVideo").is_empty() && !merged.text("recodeVideo").is_empty() {
            return Err("Choose one conversion method.".into());
        }
        if merged.flag("playlistReverse") && merged.flag("playlistRandom") {
            return Err("Reverse and random order cannot be combined.".into());
        }
        if merged.flag("lazyPlaylist")
            && (merged.flag("playlistReverse")
                || merged.flag("playlistRandom")
                || merged.text("concatPlaylist") != "never")
        {
            return Err("Lazy playlists require normal ordering without concatenation.".into());
        }
        if merged.number("maxSleepInterval") > 0
            && merged.number("maxSleepInterval") < merged.number("sleepInterval")
        {
            return Err("Maximum sleep cannot be shorter than minimum sleep.".into());
        }
        merged.set("settingsVersion", json!(3));
        Ok(merged)
    }
    pub fn public_export(&self) -> Value {
        let mut value = self.0.clone();
        for key in PRIVATE_KEYS {
            value.as_object_mut().unwrap().remove(*key);
        }
        value
    }
}

pub const PRIVATE_KEYS: &[&str] = &[
    "downloadFolder",
    "cookieMode",
    "cookieBrowser",
    "cookieLoginUrl",
    "proxyUrl",
    "refererUrl",
    "userAgent",
    "extractorArgs",
    "onboardingComplete",
    "scriptBeforeEnabled",
    "scriptAfterEnabled",
];
fn check_pattern(text: &str, pattern: &str, error: &str) -> Result<()> {
    if text.is_empty() || Regex::new(pattern).unwrap().is_match(text) {
        Ok(())
    } else {
        Err(error.into())
    }
}
pub fn url(raw: &str) -> Result<String> {
    if raw.len() > 4096 || raw.chars().any(char::is_control) {
        return Err("Invalid URL.".into());
    }
    let raw = raw.trim();
    let supplied = if raw.contains("://") {
        raw.to_owned()
    } else {
        format!("https://{raw}")
    };
    let parsed = url::Url::parse(&supplied).map_err(|_| "Only HTTP/HTTPS links are allowed.")?;
    if !matches!(parsed.scheme(), "http" | "https")
        || parsed.host_str().is_none()
        || !parsed.username().is_empty()
        || parsed.password().is_some()
    {
        return Err("Only HTTP/HTTPS links without credentials are allowed.".into());
    }
    Ok(parsed.into())
}
pub fn proxy(raw: &str) -> Result<String> {
    if raw.is_empty() {
        return Ok(String::new());
    }
    let parsed = url::Url::parse(raw).map_err(|_| "Invalid proxy URL.")?;
    if !["http", "https", "socks4", "socks5"].contains(&parsed.scheme())
        || parsed.host_str().is_none()
    {
        return Err("Invalid proxy protocol.".into());
    }
    Ok(parsed.into())
}
pub fn naming(raw: &str) -> Result<&str> {
    if raw.is_empty()
        || raw.encode_utf16().count() > 200
        || raw.starts_with('.')
        || raw
            .chars()
            .any(|c| c.is_control() || "\\/:*?\"<>|".contains(c))
    {
        return Err("Invalid output filename template.".into());
    }
    Ok(raw)
}
pub fn write_json(path: &Path, value: &Value) -> Result<()> {
    write_private(
        path,
        &serde_json::to_vec_pretty(value).map_err(|e| e.to_string())?,
    )
}
pub fn write_private(path: &Path, bytes: &[u8]) -> Result<()> {
    let parent = path.parent().ok_or("Invalid data path.")?;
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let staged = parent.join(format!(".zenith-{}.tmp", Uuid::new_v4()));
    let result = (|| {
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&staged)?;
        file.write_all(bytes)?;
        file.sync_all()?;
        drop(file);
        fs::rename(&staged, path)
    })();
    if result.is_err() {
        let _ = fs::remove_file(&staged);
    }
    result.map_err(|e| e.to_string())
}
#[cfg(windows)]
pub fn move_without_replace(source: &Path, destination: &Path) -> io::Result<()> {
    use std::os::windows::ffi::OsStrExt;
    use windows::{
        Win32::Storage::FileSystem::{MOVE_FILE_FLAGS, MoveFileExW},
        core::PCWSTR,
    };

    // Canonicalizing the parent lets the destination be new while retaining
    // Windows' verbatim path prefix for long and UNC paths.
    let name = destination
        .file_name()
        .ok_or_else(|| io::Error::other("Destination has no filename."))?;
    let parent = destination
        .parent()
        .ok_or_else(|| io::Error::other("Destination has no folder."))?;
    let source = fs::canonicalize(source)?;
    let destination = fs::canonicalize(parent)?.join(name);
    let wide = |path: &Path| {
        path.as_os_str()
            .encode_wide()
            .chain([0])
            .collect::<Vec<_>>()
    };
    let from = wide(&source);
    let to = wide(&destination);
    // Zero flags prevent replacement and cross-volume copying. Callers stage
    // the file in the destination folder before requesting the rename.
    unsafe {
        MoveFileExW(
            PCWSTR(from.as_ptr()),
            PCWSTR(to.as_ptr()),
            MOVE_FILE_FLAGS(0),
        )
    }
    .map_err(|error| {
        let code = error.code().0 as u32;
        if code >> 16 == 0x8007 {
            io::Error::from_raw_os_error((code & 0xffff) as i32)
        } else {
            io::Error::other(error)
        }
    })
}
#[cfg(not(windows))]
pub fn move_without_replace(source: &Path, destination: &Path) -> io::Result<()> {
    fs::hard_link(source, destination)?;
    let _ = fs::remove_file(source);
    Ok(())
}
pub fn read_json(path: &Path, limit: u64) -> Result<Value> {
    let file = fs::File::open(path).map_err(|error| error.to_string())?;
    let mut bytes = Vec::new();
    file.take(limit.saturating_add(1))
        .read_to_end(&mut bytes)
        .map_err(|error| error.to_string())?;
    if bytes.len() as u64 > limit {
        return Err("Data file is too large.".into());
    }
    serde_json::from_slice(&bytes).map_err(|error| error.to_string())
}
pub fn data_dir() -> PathBuf {
    std::env::var_os("ZENITHW_DATA_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            dirs::config_dir()
                .unwrap_or_else(std::env::temp_dir)
                .join("Zenith Stable")
        })
}
#[cfg(windows)]
fn system_language() -> String {
    use windows::Win32::Globalization::GetUserDefaultLocaleName;
    const LOCALE_NAME_MAX_LENGTH: usize = 85;
    let mut name = [0; LOCALE_NAME_MAX_LENGTH];
    let length = unsafe { GetUserDefaultLocaleName(&mut name) };
    if length > 0 {
        String::from_utf16_lossy(&name[..length as usize - 1])
    } else {
        String::new()
    }
}
#[cfg(not(windows))]
fn system_language() -> String {
    std::env::var("LANG").unwrap_or_default()
}

pub fn load(data: &Path) -> Result<Settings> {
    let mut settings = Settings::defaults();
    settings.set(
        "downloadFolder",
        json!(
            dirs::download_dir()
                .unwrap_or_else(std::env::temp_dir)
                .join("Zenith")
        ),
    );
    let locale = system_language().to_ascii_lowercase();
    let language = locale
        .split(['-', '_', '.'])
        .next()
        .filter(|value| ["tr", "ru", "de"].contains(value))
        .unwrap_or("en");
    settings.set("language", json!(language));
    let saved = data.join("settings.json");
    let Ok(mut saved) = read_json(&saved, 65536) else {
        return Ok(settings);
    };
    if !saved.is_object() {
        return Ok(settings);
    }
    // Older releases made thumbnail embedding opt-in when loading unversioned settings.
    if saved["settingsVersion"].as_u64().unwrap_or(0) == 0 {
        saved["embedThumbnail"] = json!(false);
    }
    if let Ok(valid) = settings.validate(&saved) {
        return Ok(valid);
    }

    // A malformed field in a legacy or manually edited file must not prevent
    // startup. Apply the valid fields and leave the file untouched until a save.
    for (key, value) in saved.as_object().unwrap() {
        if let Ok(valid) = settings.validate(&json!({ key: value })) {
            settings = valid;
        }
    }
    Ok(settings)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn protects_templates_and_validates_saved_settings() {
        for bad in ["../outside", "C:escape", "folder/name", ".hidden", "file\n"] {
            assert!(naming(bad).is_err());
        }
        assert!(naming("%(title)s [%(id)s].%(ext)s").is_ok());
        assert!(url("javascript:alert(1)").is_err());
        assert!(url("https://name:pass@example.com").is_err());
        assert_eq!(
            url("example.com/watch").unwrap(),
            "https://example.com/watch"
        );
        let folder = std::env::temp_dir();
        let mut settings = Settings::defaults();
        settings.set("downloadFolder", json!(folder));
        assert!(
            settings
                .validate(&json!({"remuxVideo":"mp4","recodeVideo":"mkv"}))
                .is_err()
        );
        assert!(
            settings
                .validate(&json!({"lazyPlaylist":true,"playlistReverse":true}))
                .is_err()
        );
        let next = settings
            .validate(&json!({"maxDownloads":100,"systemNotifications":true}))
            .unwrap();
        assert_eq!(next.number("maxDownloads"), 8);
        assert!(next.flag("systemNotifications"));
        assert!(next.public_export().get("downloadFolder").is_none());
    }
    #[test]
    fn atomic_replacement_preserves_valid_json() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("settings.json");
        write_json(&file, &json!({"value":1})).unwrap();
        write_json(&file, &json!({"value":2})).unwrap();
        assert_eq!(read_json(&file, 100).unwrap()["value"], 2);
    }

    #[test]
    fn preserves_valid_legacy_settings_and_ignores_invalid_fields() {
        let data = tempfile::tempdir().unwrap();
        let folder = data.path().join("Downloads");
        let saved = json!({
            "downloadFolder": folder, "language": "tr", "embedThumbnail": true,
            "maxDownloads": 6, "videoCodec": "invalid",
        });
        let file = data.path().join("settings.json");
        write_json(&file, &saved).unwrap();
        let settings = load(data.path()).unwrap();
        assert_eq!(Path::new(settings.text("downloadFolder")), folder);
        assert_eq!(settings.text("language"), "tr");
        assert_eq!(settings.text("videoCodec"), "h264");
        assert_eq!(settings.number("maxDownloads"), 6);
        assert!(!settings.flag("embedThumbnail"));
        assert_eq!(read_json(&file, 65536).unwrap(), saved);
    }
}
