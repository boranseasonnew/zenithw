use regex::Regex;
use std::sync::LazyLock;

static ARIA2_FAILURE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)aria2c exited with code [0-9]+").unwrap());
static EXPIRED_SOURCE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)(?:HTTP Error|HTTP status|status=)\s*(?:403|410)\b").unwrap()
});
static URL: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(?i)https?://\S+").unwrap());
static PRIVATE_HEADER: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)((?:cookie|authorization|proxy-authorization|set-cookie)\s*[:=])[^\r\n]*")
        .unwrap()
});

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Retry {
    NativeAfterAria2,
    RefreshSource,
    RestartNativeWithoutPartial,
}

/// After either transport failure, the retry uses a freshly resolved source
/// and the native downloader. Only a range restart discards partial files.
pub fn download_retry(
    attempt: u8,
    exit_code: Option<i32>,
    diagnostic: &str,
    used_aria2: bool,
    refreshed: bool,
    restarted: bool,
) -> Option<Retry> {
    if exit_code == Some(0) || attempt >= 2 {
        return None;
    }
    if used_aria2 && ARIA2_FAILURE.is_match(diagnostic) {
        return Some(Retry::NativeAfterAria2);
    }
    if !EXPIRED_SOURCE.is_match(diagnostic) {
        return None;
    }
    if !refreshed {
        return Some(Retry::RefreshSource);
    }
    (!restarted).then_some(Retry::RestartNativeWithoutPartial)
}

pub fn redact_diagnostic(diagnostic: &str) -> String {
    let without_urls = URL.replace_all(diagnostic, "[URL]");
    let safe = PRIVATE_HEADER.replace_all(&without_urls, "$1 [REDACTED]");
    let mut remaining = 12_000;
    for (offset, character) in safe.char_indices().rev() {
        if character.len_utf16() > remaining {
            return safe[offset + character.len_utf8()..].to_owned();
        }
        remaining -= character.len_utf16();
    }
    safe.into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn falls_back_to_native_then_allows_one_clean_restart() {
        assert_eq!(
            download_retry(
                0,
                Some(22),
                "ERROR: aria2c exited with code 22",
                true,
                false,
                false
            ),
            Some(Retry::NativeAfterAria2)
        );
        assert_eq!(
            download_retry(1, Some(1), "HTTP Error 403: Forbidden", false, true, false),
            Some(Retry::RestartNativeWithoutPartial)
        );
        assert_eq!(
            download_retry(1, Some(1), "HTTP Error 403", false, true, true),
            None
        );
    }

    #[test]
    fn refreshes_expired_sources_without_retrying_success_or_other_failures() {
        let expired = "HTTP status 410: Gone";
        assert_eq!(
            download_retry(0, Some(1), expired, false, false, false),
            Some(Retry::RefreshSource)
        );
        assert_eq!(
            download_retry(2, Some(1), expired, false, true, false),
            None
        );
        assert_eq!(
            download_retry(0, Some(0), expired, false, false, false),
            None
        );
        for error in [
            "HTTP Error 4030",
            "Video unavailable",
            "ffmpeg: conversion failed",
        ] {
            assert_eq!(download_retry(0, Some(1), error, true, false, false), None);
        }
    }

    #[test]
    fn redacts_urls_and_private_headers_before_limiting_the_tail() {
        let input = "HTTP Error 403 HTTPS://example.test/media?secret=123\nCookie: SID=123\nProxy-Authorization: Bearer 123";
        assert_eq!(
            redact_diagnostic(input),
            "HTTP Error 403 [URL]\nCookie: [REDACTED]\nProxy-Authorization: [REDACTED]"
        );
        let text = format!("older output {}", "🎞".repeat(6000));
        assert_eq!(redact_diagnostic(&text), "🎞".repeat(6000));
    }
}
