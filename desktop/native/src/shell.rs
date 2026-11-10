use crate::{
    engine::Engine,
    settings::{self, PRIVATE_KEYS, Result},
};
use futures_util::StreamExt;
use serde_json::{Value, json};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::Arc,
    time::Duration,
};
use tauri::{
    AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{TrayIconBuilder, TrayIconEvent},
    webview::{NewWindowResponse, PermissionKind, PermissionResponse},
};
use tauri_plugin_dialog::{DialogExt, FilePath};
use tauri_plugin_opener::OpenerExt;
use uuid::Uuid;

const VERSION: &str = env!("CARGO_PKG_VERSION");
const RELEASE_API: &str = "https://api.github.com/repos/boranseasonnew/zenithw/releases";
const RELEASE_PAGE: &str = "https://github.com/boranseasonnew/zenithw/releases";

fn local_origin(url: &url::Url) -> bool {
    matches!(
        (url.scheme(), url.host_str()),
        ("tauri", Some("localhost")) | ("http", Some("tauri.localhost"))
    ) && url.port().is_none()
        && url.username().is_empty()
        && url.password().is_none()
        && matches!(url.path(), "/" | "/app.html")
}
fn err(error: impl std::fmt::Display) -> String {
    error.to_string()
}
fn as_json(value: impl serde::Serialize) -> Result<Value> {
    serde_json::to_value(value).map_err(err)
}
fn selected(path: Option<FilePath>) -> Result<Option<PathBuf>> {
    path.map(|path| path.into_path().map_err(err)).transpose()
}
fn arg(args: &[Value], index: usize) -> Result<&str> {
    args.get(index)
        .and_then(Value::as_str)
        .ok_or_else(|| "Invalid argument.".into())
}
fn now_cookie_rows(content: &str) -> Result<usize> {
    if !content
        .lines()
        .any(|line| matches!(line, "# Netscape HTTP Cookie File" | "# HTTP Cookie File"))
    {
        return Err("Choose a Netscape cookie file.".into());
    }
    let rows = content
        .lines()
        .filter(|line| {
            !line.is_empty() && (!line.starts_with('#') || line.starts_with("#HttpOnly_"))
        })
        .collect::<Vec<_>>();
    if rows.is_empty() || rows.len() > 2000 || rows.iter().any(|line| line.split('\t').count() != 7)
    {
        return Err("Invalid cookie file.".into());
    }
    Ok(rows.len())
}
fn import_cookies(engine: &Engine, content: &str) -> Result<Value> {
    let count = now_cookie_rows(content)?;
    settings::write_private(
        &engine.tools.data.join("session-cookies.txt"),
        content.as_bytes(),
    )?;
    engine.save(&json!({"cookieMode":"session"}))?;
    Ok(
        json!({"count":count,"message":engine.local("Oturum çerezleri yalnızca bu bilgisayara kaydedildi.")}),
    )
}
fn cookies_window(engine: &Arc<Engine>, target: Option<url::Url>) -> Result<WebviewWindow> {
    if let Some(existing) = engine.app.get_webview_window("login") {
        if let Some(target) = target {
            existing.navigate(target).map_err(err)?;
            existing.show().map_err(err)?;
            existing.set_focus().map_err(err)?;
        }
        return Ok(existing);
    }
    let visible = target.is_some();
    let url = target.unwrap_or_else(|| url::Url::parse("about:blank").unwrap());
    let app = engine.app.clone();
    let mut builder = WebviewWindowBuilder::new(&engine.app, "login", WebviewUrl::External(url))
        .title(format!("Zenith — {}", engine.local("Tarayıcı oturumu")))
        .inner_size(1040.0, 760.0)
        .min_inner_size(680.0, 520.0)
        .visible(visible)
        .data_directory(engine.tools.data.join("webview-login"))
        .on_navigation(|url| url.scheme() == "https" || url.as_str() == "about:blank")
        .on_permission_request(|_, _| PermissionResponse::Deny)
        .on_new_window(move |url, _| {
            if url.scheme() == "https" {
                if let Some(window) = app.get_webview_window("login") {
                    let _ = window.navigate(url);
                }
            }
            NewWindowResponse::Deny
        });
    if let Some(main) = engine.app.get_webview_window("main") {
        builder = builder.parent(&main).map_err(err)?;
    }
    let window = builder.build().map_err(err)?;
    if visible {
        let engine = engine.clone();
        let login = window.clone();
        window.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let login = login.clone();
                let engine = engine.clone();
                let _ = login.hide();
                tauri::async_runtime::spawn(async move {
                    let _gate = engine.cookie_gate.lock().await;
                    let result = export_login(&engine, &login)
                        .await
                        .unwrap_or_else(|error| json!({"count":0,"message":error}));
                    let _ = login.destroy();
                    let _ = engine.app.emit_to("main", "cookies:updated", result);
                });
            }
        });
    }
    Ok(window)
}
async fn export_login(engine: &Engine, login: &WebviewWindow) -> Result<Value> {
    let login = login.clone();
    let cookies = tauri::async_runtime::spawn_blocking(move || login.cookies().map_err(err))
        .await
        .map_err(err)??;
    if cookies.is_empty() {
        return Ok(
            json!({"count":0,"message":engine.local("Kaydedilecek oturum çerezi bulunamadı.")}),
        );
    }
    let clean = |s: &str| s.replace(['\t', '\r', '\n'], "");
    let mut text =
        String::from("# Netscape HTTP Cookie File\n# Generated locally by ZenithW Desktop\n\n");
    for cookie in cookies.into_iter().take(2000) {
        let Some(domain) = cookie.domain() else {
            continue;
        };
        let prefix = if cookie.http_only().unwrap_or(false) {
            "#HttpOnly_"
        } else {
            ""
        };
        let expiration = cookie
            .expires_datetime()
            .map(|d| d.unix_timestamp().max(0))
            .unwrap_or(0);
        text.push_str(&format!(
            "{prefix}{}\t{}\t{}\t{}\t{expiration}\t{}\t{}\n",
            clean(domain),
            if domain.starts_with('.') {
                "TRUE"
            } else {
                "FALSE"
            },
            clean(cookie.path().unwrap_or("/")),
            if cookie.secure().unwrap_or(false) {
                "TRUE"
            } else {
                "FALSE"
            },
            clean(cookie.name()),
            clean(cookie.value())
        ));
    }
    import_cookies(engine, &text)
}
fn show(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}
fn sync_theme(engine: &Engine) {
    let settings = engine.settings();
    let theme = match settings.text("theme") {
        "light" => Some(tauri::Theme::Light),
        "dark" | "neon" => Some(tauri::Theme::Dark),
        _ => None,
    };
    if let Some(window) = engine.app.get_webview_window("main") {
        let _ = window.set_theme(theme);
    }
}
fn sync_tray(engine: &Engine) -> tauri::Result<()> {
    let app = &engine.app;
    let enabled = engine.settings().flag("trayEnabled");
    if let Some(tray) = app.tray_by_id("zenith") {
        tray.set_visible(enabled)?;
        return Ok(());
    }
    if !enabled {
        return Ok(());
    }
    let open = MenuItem::with_id(
        app,
        "open",
        engine.local("Uygulamayı aç"),
        true,
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(app, "quit", engine.local("Çıkış"), true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let menu = Menu::with_items(app, &[&open, &separator, &quit])?;
    let mut tray = TrayIconBuilder::with_id("zenith")
        .tooltip("Zenith")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "open" => show(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if matches!(event, TrayIconEvent::DoubleClick { .. }) {
                show(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}
pub struct SleepGuard(Option<std::sync::mpsc::Sender<()>>);
impl SleepGuard {
    pub fn new(enabled: bool) -> Self {
        if !enabled {
            return Self(None);
        }
        let (tx, rx) = std::sync::mpsc::channel();
        std::thread::spawn(move || {
            #[cfg(windows)]
            unsafe {
                use windows::Win32::System::Power::{
                    ES_CONTINUOUS, ES_SYSTEM_REQUIRED, SetThreadExecutionState,
                };
                SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED);
                let _ = rx.recv();
                SetThreadExecutionState(ES_CONTINUOUS);
            }
            #[cfg(not(windows))]
            let _ = rx.recv();
        });
        Self(Some(tx))
    }
}
impl Drop for SleepGuard {
    fn drop(&mut self) {
        if let Some(tx) = self.0.take() {
            let _ = tx.send(());
        }
    }
}

fn store_build() -> bool {
    #[cfg(windows)]
    {
        use windows::Win32::{
            Foundation::ERROR_INSUFFICIENT_BUFFER,
            Storage::Packaging::Appx::GetCurrentPackageFullName,
        };
        let mut length = 0;
        unsafe { GetCurrentPackageFullName(&mut length, None) == ERROR_INSUFFICIENT_BUFFER }
    }
    #[cfg(not(windows))]
    {
        false
    }
}
fn release_candidate(value: &Value) -> Option<(semver::Version, String, Value)> {
    if value["draft"] == true || value["prerelease"] == true {
        return None;
    }
    let tag = value["tag_name"].as_str()?;
    let version = semver::Version::parse(tag.strip_prefix('v').unwrap_or(tag)).ok()?;
    if !version.pre.is_empty() {
        return None;
    }
    let names = [
        format!("Zenith-{version}-Windows-Setup.exe"),
        format!("Zenith-{version}-Windows.exe"),
        format!("ZenithW-{version}-Windows-Setup.exe"),
        format!("ZenithW-{version}-Windows.exe"),
    ];
    let supported = value["assets"].as_array()?.iter().any(|asset| {
        asset["name"].as_str().is_some_and(|name| {
            names.iter().any(|expected| expected == name)
                || (name == "ZenithW-Setup.exe"
                    && value["name"].as_str().is_some_and(|s| {
                        let s = s.to_ascii_lowercase();
                        s.contains("desktop") || s.contains("windows")
                    }))
        })
    });
    supported.then_some((
        version,
        format!("{RELEASE_PAGE}/tag/{tag}"),
        value["published_at"].clone(),
    ))
}
async fn releases(url: String) -> Result<Value> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(12))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(err)?;
    let response = client
        .get(url)
        .header("User-Agent", "ZenithW-Desktop-Update-Check")
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(err)?;
    if response.status() == 404 {
        return Ok(Value::Null);
    }
    let mut stream = response.error_for_status().map_err(err)?.bytes_stream();
    let mut bytes = Vec::new();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(err)?;
        if bytes.len() + chunk.len() > 256 * 1024 {
            return Err("Release information is too large.".into());
        }
        bytes.extend_from_slice(&chunk);
    }
    serde_json::from_slice(&bytes).map_err(err)
}
async fn app_update(engine: &Engine) -> Result<Value> {
    if store_build() {
        return Ok(json!({"status":"store_managed","currentVersion":VERSION}));
    }
    let mut cache = engine.release_cache.lock().await;
    if let Some((_, value)) = cache
        .as_ref()
        .filter(|(at, _)| at.elapsed() < Duration::from_secs(300))
    {
        return Ok(value.clone());
    }
    let latest = releases(format!("{RELEASE_API}/latest")).await?;
    let candidate = match release_candidate(&latest) {
        Some(candidate) => candidate,
        None => releases(format!("{RELEASE_API}?per_page=30"))
            .await?
            .as_array()
            .and_then(|values| {
                values
                    .iter()
                    .take(30)
                    .filter_map(release_candidate)
                    .max_by(|a, b| a.0.cmp(&b.0))
            })
            .ok_or("No Windows release was found.")?,
    };
    let status = match semver::Version::parse(VERSION)
        .map_err(err)?
        .cmp(&candidate.0)
    {
        std::cmp::Ordering::Less => "available",
        std::cmp::Ordering::Equal => "current",
        std::cmp::Ordering::Greater => "ahead",
    };
    *engine.offered_release.lock().unwrap() = (status == "available").then(|| candidate.1.clone());
    let value = json!({"currentVersion":VERSION,"latestVersion":candidate.0.to_string(),"status":status,"url":candidate.1,"publishedAt":candidate.2});
    *cache = Some((std::time::Instant::now(), value.clone()));
    Ok(value)
}

#[tauri::command]
async fn dispatch(
    window: WebviewWindow,
    engine: State<'_, Arc<Engine>>,
    channel: String,
    args: Vec<Value>,
) -> Result<Value> {
    if window.label() != "main" || !local_origin(&window.url().map_err(err)?) {
        return Err("Unauthorized command sender.".into());
    }
    let engine = engine.inner();
    let dialog = || engine.app.dialog().file().set_parent(&window);
    let first = args.first().cloned().unwrap_or(Value::Null);
    match channel.as_str() {
        "settings:get" => as_json(engine.settings()),
        "settings:save" => {
            let value = engine.save(&first)?;
            if first.get("theme").is_some() {
                sync_theme(engine);
            }
            let _ = sync_tray(engine);
            engine.pump();
            as_json(value)
        }
        "settings:export" => {
            let file = selected(
                dialog()
                    .set_file_name("ZenithW-settings.json")
                    .add_filter("JSON", &["json"])
                    .blocking_save_file(),
            )?;
            let Some(file) = file else {
                return Ok(json!(false));
            };
            settings::write_json(
                &file,
                &json!({"version":1,"settings":engine.settings().public_export()}),
            )?;
            Ok(json!(true))
        }
        "settings:import" => {
            let file = selected(
                dialog()
                    .add_filter("ZenithW settings", &["json"])
                    .blocking_pick_file(),
            )?;
            let Some(file) = file else {
                return Ok(Value::Null);
            };
            let value = settings::read_json(&file, 65536)?;
            let mut imported = value["settings"].clone();
            if value["version"] != 1 || !imported.is_object() {
                return Err("Choose a valid ZenithW settings file.".into());
            }
            for key in PRIVATE_KEYS {
                imported.as_object_mut().unwrap().remove(*key);
            }
            let value = engine.save(&imported)?;
            sync_theme(engine);
            let _ = sync_tray(engine);
            engine.pump();
            as_json(value)
        }
        "folder:choose" => as_json(selected(dialog().blocking_pick_folder())?),
        "folder:open" => {
            let folder = engine.settings().text("downloadFolder").to_owned();
            fs::create_dir_all(&folder).map_err(err)?;
            engine
                .app
                .opener()
                .open_path(folder, None::<&str>)
                .map_err(err)?;
            Ok(Value::Null)
        }
        "media:inspect" => {
            Box::pin(engine.inspect(
                    arg(&args, 0)?,
                    args.get(1)
                        .and_then(Value::as_str)
                        .map(|v| v.chars().take(100).collect())
                        .unwrap_or_else(|| Uuid::new_v4().to_string()),
                    false,
                )).await
        }
        "media:playlist" => Box::pin(engine.inspect(arg(&args, 0)?, Uuid::new_v4().to_string(), true)).await,
        "media:cancelInspect" => Ok(json!(
            engine.cancel_inspection(args.first().and_then(Value::as_str))
        )),
        "download:start" => engine.start(&first),
        "download:cancel" => Ok(json!(engine.cancel(arg(&args, 0)?))),
        "history:get" => {
            let store = engine.store.lock().unwrap();
            let mut items = store.history.clone();
            for item in &mut items {
                item["files"] = json!(
                    item["files"]
                        .as_array()
                        .into_iter()
                        .flatten()
                        .filter_map(|v| Path::new(v.as_str()?)
                            .file_name()
                            .map(|v| v.to_string_lossy()))
                        .collect::<Vec<_>>()
                );
            }
            Ok(json!(items))
        }
        "history:remove" => {
            let id = arg(&args, 0)?;
            if engine.jobs.lock().unwrap().iter().any(|j| j.id() == id) {
                return Ok(json!(false));
            }
            let mut store = engine.store.lock().unwrap();
            let mut next = store.history.clone();
            next.retain(|v| v["id"] != id);
            settings::write_json(&engine.tools.data.join("history.json"), &json!(next))?;
            store.history = next;
            Ok(json!(true))
        }
        "history:open" => {
            let id = arg(&args, 0)?;
            let file = engine
                .store
                .lock()
                .unwrap()
                .history
                .iter()
                .find(|v| v["id"] == id)
                .and_then(|v| v["files"][0].as_str())
                .map(PathBuf::from)
                .ok_or("File not found.")?;
            if !file.is_absolute() || !file.is_file() || !crate::media::is_media(&file) {
                return Err("File not found.".into());
            }
            if args.get(1) == Some(&json!(true)) {
                engine.app.opener().reveal_item_in_dir(file).map_err(err)?;
            } else {
                engine
                    .app
                    .opener()
                    .open_path(file.to_string_lossy().into_owned(), None::<&str>)
                    .map_err(err)?;
            }
            Ok(Value::Null)
        }
        "profiles:list" => Ok(json!(
            engine
                .store
                .lock()
                .unwrap()
                .profiles
                .iter()
                .map(|p| json!({"id":p["id"],"name":p["name"]}))
                .collect::<Vec<_>>()
        )),
        "profiles:save" => {
            let label = arg(&args, 0)?.trim().chars().take(40).collect::<String>();
            if label.is_empty() {
                return Err("Enter a profile name.".into());
            }
            let mut store = engine.store.lock().unwrap();
            let mut profiles = store.profiles.clone();
            let existing = profiles.iter().position(|p| p["name"] == label);
            if existing.is_none() && profiles.len() >= 12 {
                return Err("Up to 12 profiles are supported.".into());
            }
            let id = existing
                .map(|i| profiles.remove(i)["id"].as_str().unwrap_or("").to_owned())
                .unwrap_or_else(|| Uuid::new_v4().to_string());
            profiles.insert(0, json!({"id":id,"name":label,"settings":store.settings.0}));
            settings::write_json(&engine.tools.data.join("profiles.json"), &json!(profiles))?;
            store.profiles = profiles;
            Ok(json!({"id":id,"name":label}))
        }
        "profiles:load" => {
            let id = arg(&args, 0)?;
            let mut data = engine
                .store
                .lock()
                .unwrap()
                .profiles
                .iter()
                .find(|p| p["id"] == id)
                .map(|p| p["settings"].clone())
                .ok_or("Profile not found.")?;
            data["onboardingComplete"] = json!(true);
            let next = engine.save(&data)?;
            sync_theme(engine);
            let _ = sync_tray(engine);
            engine.pump();
            as_json(next)
        }
        "scripts:get" => Ok(engine.store.lock().unwrap().scripts.clone()),
        "scripts:choose" | "scripts:clear" => {
            let phase = arg(&args, 0)?;
            if !["before", "after"].contains(&phase) {
                return Err("Invalid script phase.".into());
            }
            let file = if channel == "scripts:choose" {
                let file = selected(
                    dialog()
                        .add_filter("PowerShell script", &["ps1"])
                        .blocking_pick_file(),
                )?;
                let Some(file) = file else {
                    return Ok(Value::Null);
                };
                if !file.is_absolute()
                    || !file.is_file()
                    || file
                        .extension()
                        .is_none_or(|ext| !ext.eq_ignore_ascii_case("ps1"))
                {
                    return Err("Choose a valid PowerShell script.".into());
                }
                Some(file)
            } else {
                None
            };
            let mut store = engine.store.lock().unwrap();
            let mut scripts = store.scripts.clone();
            if let Some(file) = file {
                scripts[phase] = json!(file);
            } else {
                scripts.as_object_mut().unwrap().remove(phase);
            }
            settings::write_json(&engine.tools.data.join("scripts.json"), &scripts)?;
            store.scripts = scripts.clone();
            drop(store);
            if channel == "scripts:clear" {
                let key = if phase == "before" {
                    "scriptBeforeEnabled"
                } else {
                    "scriptAfterEnabled"
                };
                engine.save(&json!({key:false}))?;
            }
            Ok(scripts)
        }
        "cookies:login" => {
            let _gate = engine.cookie_gate.lock().await;
            let current = engine.settings();
            let target = settings::url(
                first
                    .as_str()
                    .filter(|v| !v.is_empty())
                    .unwrap_or(current.text("cookieLoginUrl")),
            )?;
            if !target.starts_with("https://") {
                return Err("Login requires HTTPS.".into());
            }
            engine.save(&json!({"cookieLoginUrl":target}))?;
            cookies_window(engine, Some(url::Url::parse(&target).map_err(err)?))?;
            Ok(json!({"opened":true}))
        }
        "cookies:save" => {
            let _gate = engine.cookie_gate.lock().await;
            let temporary = engine.app.get_webview_window("login").is_none();
            let login = cookies_window(engine, None)?;
            let result = export_login(engine, &login).await;
            if temporary {
                let _ = login.destroy();
            }
            result
        }
        "cookies:clear" => {
            let _gate = engine.cookie_gate.lock().await;
            let temporary = engine.app.get_webview_window("login").is_none();
            let login = cookies_window(engine, None)?;
            let view = login.clone();
            tauri::async_runtime::spawn_blocking(move || {
                for cookie in view.cookies().map_err(err)? {
                    view.delete_cookie(cookie).map_err(err)?;
                }
                Ok::<_, String>(())
            })
            .await
            .map_err(err)??;
            if temporary {
                let _ = login.destroy();
            }
            let file = engine.tools.data.join("session-cookies.txt");
            if file.exists() {
                fs::remove_file(file).map_err(err)?;
            }
            engine.save(&json!({"cookieMode":"none"}))?;
            Ok(json!({"count":0}))
        }
        "cookies:import" => {
            let _gate = engine.cookie_gate.lock().await;
            let file = selected(
                dialog()
                    .add_filter("Netscape cookies", &["txt"])
                    .blocking_pick_file(),
            )?;
            let Some(file) = file else {
                return Ok(json!(false));
            };
            if fs::metadata(&file).map_err(err)?.len() > 1024 * 1024 {
                return Err("Cookie file is too large.".into());
            }
            import_cookies(engine, &fs::read_to_string(file).map_err(err)?)
        }
        "engine:update" => Box::pin(engine.update(arg(&args, 0)?)).await,
        "app:tools" => Box::pin(async {
            let (ytdlp, ffmpeg, aria2) = tokio::join!(
                engine.tool("yt-dlp.exe", &["--version"]),
                engine.tool("ffmpeg.exe", &["-version"]),
                engine.tool("aria2c.exe", &["--version"])
            );
            let file = engine.tools.data.join("session-cookies.txt");
            let count = fs::read_to_string(&file)
                .ok()
                .and_then(|text| now_cookie_rows(&text).ok())
                .unwrap_or(0);
            Ok(
                json!({"ytDlp":ytdlp.is_some(),"ytDlpVersion":ytdlp,"ffmpeg":ffmpeg.is_some(),"ffmpegVersion":ffmpeg,"aria2":aria2.is_some(),"aria2Version":aria2,
                "cookieCount":count,"sessionCookies":file.is_file(),"directConnection":engine.settings().text("proxyUrl").is_empty()}),
            )
        }).await,
        "app:info" => Ok(
            json!({"version":VERSION,"portable":std::env::current_exe().ok().is_some_and(|exe|exe.with_file_name("portable.marker").is_file()),"store":store_build()}),
        ),
        "app:checkUpdate" => app_update(engine).await,
        "app:openRelease" => {
            let url = if store_build() {
                "ms-windows-store://downloadsandupdates".into()
            } else {
                engine
                    .offered_release
                    .lock()
                    .unwrap()
                    .clone()
                    .ok_or("Check for updates first.")?
            };
            engine
                .app
                .opener()
                .open_url(url, None::<&str>)
                .map_err(err)?;
            Ok(Value::Null)
        }
        "app:external" => {
            let target = match arg(&args, 0)? {
                "source" => "https://github.com/boranseasonnew/zenithw",
                "website" => "https://zenithw.space",
                "sponsor" => "https://github.com/sponsors/boranseasonnew",
                _ => return Err("Invalid external link.".into()),
            };
            engine
                .app
                .opener()
                .open_url(target, None::<&str>)
                .map_err(err)?;
            Ok(Value::Null)
        }
        _ => Err("Unknown desktop command.".into()),
    }
}

pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![dispatch])
        .setup(|app| {
            let root = std::env::var_os("ZENITHW_RESOURCES_DIR")
                .map(PathBuf::from)
                .unwrap_or(app.path().resource_dir()?);
            let engine = Engine::new(app.handle().clone(), root).map_err(std::io::Error::other)?;
            app.manage(engine.clone());
            let config = &app.config().app.windows[0];
            WebviewWindowBuilder::from_config(app, config)?
                .data_directory(engine.tools.data.join("webview-main"))
                .on_navigation(local_origin)
                .on_new_window(|_, _| NewWindowResponse::Deny)
                .on_permission_request(|_, kind| {
                    if kind == PermissionKind::ClipboardRead {
                        PermissionResponse::Allow
                    } else {
                        PermissionResponse::Deny
                    }
                })
                .build()?;
            sync_theme(&engine);
            sync_tray(&engine)?;
            if engine.settings().flag("autoUpdateYtDlp") {
                tauri::async_runtime::spawn(async move {
                    loop {
                        tokio::time::sleep(Duration::from_secs(30)).await;
                        let settings = engine.settings();
                        if !settings.flag("autoUpdateYtDlp") {
                            break;
                        }
                        if !engine.jobs.lock().unwrap().is_empty()
                            || engine.inspection.lock().unwrap().is_some()
                        {
                            continue;
                        }
                        let result = engine
                            .update(settings.text("ytDlpChannel"))
                            .await
                            .unwrap_or_else(|error| json!({"error":error}));
                        let _ = engine.app.emit_to("main", "engine:updated", result);
                        break;
                    }
                });
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() != "main" {
                return;
            }
            if let Some(engine) = window.try_state::<Arc<Engine>>() {
                if matches!(event, tauri::WindowEvent::CloseRequested { .. }) {
                    engine.shutdown();
                    window.app_handle().exit(0);
                }
                if matches!(
                    event,
                    tauri::WindowEvent::Focused(false) | tauri::WindowEvent::Resized(_)
                ) && engine.settings().flag("trayEnabled")
                    && window.is_minimized().unwrap_or(false)
                {
                    let _ = window.hide();
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("Could not start ZenithW Desktop");
    app.run(|app, event| {
        if matches!(event, tauri::RunEvent::Exit) {
            if let Some(engine) = app.try_state::<Arc<Engine>>() {
                engine.shutdown();
            }
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn commands_trust_only_the_packaged_origin_and_release_checks_require_windows_assets() {
        assert!(local_origin(
            &url::Url::parse("http://tauri.localhost/app.html").unwrap()
        ));
        assert!(!local_origin(
            &url::Url::parse("https://tauri.localhost.example/app.html").unwrap()
        ));
        assert!(!local_origin(
            &url::Url::parse("http://tauri.localhost:8123/app.html").unwrap()
        ));
        assert!(!local_origin(
            &url::Url::parse("https://youtube.com/").unwrap()
        ));
        let mut release = json!({"tag_name":"v5.0.0","assets":[{"name":"website.zip"}]});
        assert!(release_candidate(&release).is_none());
        release["assets"][0]["name"] = json!("Zenith-5.0.0-Windows-Setup.exe");
        assert_eq!(release_candidate(&release).unwrap().0.to_string(), "5.0.0");
    }
}
