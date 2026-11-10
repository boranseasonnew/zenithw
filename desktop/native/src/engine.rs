use crate::{
    arguments::{self, Download, Tools},
    media,
    process::{self, Cancel, Options},
    progress::Tracker,
    settings::{self, Result, Settings, read_json, write_json},
};
use serde_json::{Value, json};
use std::{
    collections::VecDeque,
    fs,
    path::{Path, PathBuf},
    sync::{
        Arc, LazyLock, Mutex,
        atomic::{AtomicBool, AtomicU8, Ordering},
    },
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter};
use zenithw_desktop_core::{
    formats::{SourceFormat, video_choices},
    retry::{Retry, download_retry, redact_diagnostic},
};

pub struct Store {
    pub settings: Settings,
    pub history: Vec<Value>,
    pub profiles: Vec<Value>,
    pub scripts: Value,
}
pub struct Job {
    pub download: Download,
    pub cancel: Cancel,
    pub state: AtomicU8,
    pub committing: AtomicBool,
    pub work: PathBuf,
    pub scripts: Value,
    title: Mutex<String>,
}
impl Job {
    pub fn id(&self) -> &str {
        self.download.job["id"].as_str().unwrap()
    }
}
pub struct Engine {
    pub app: AppHandle,
    pub tools: Tools,
    pub store: Mutex<Store>,
    pub jobs: Mutex<VecDeque<Arc<Job>>>,
    pub inspection: Mutex<Option<(String, Cancel)>>,
    pub updating: AtomicBool,
    pub offered_release: Mutex<Option<String>>,
    pub release_cache: tokio::sync::Mutex<Option<(Instant, Value)>>,
    pub cookie_gate: tokio::sync::Mutex<()>,
    power: Mutex<Option<crate::shell::SleepGuard>>,
    media_cache: Mutex<VecDeque<(String, Instant, Arc<Value>)>>,
}
fn list(path: &Path, limit: usize) -> Vec<Value> {
    read_json(path, 4 * 1024 * 1024)
        .ok()
        .and_then(|v| v.as_array().cloned())
        .unwrap_or_default()
        .into_iter()
        .take(limit)
        .collect()
}
impl Engine {
    pub fn new(app: AppHandle, root: PathBuf) -> Result<Arc<Self>> {
        let data = settings::data_dir();
        fs::create_dir_all(&data).map_err(|e| e.to_string())?;
        if let Ok(work) = fs::read_dir(data.join("work")) {
            for entry in work.flatten() {
                if entry.file_type().is_ok_and(|kind| kind.is_dir())
                    && uuid::Uuid::parse_str(&entry.file_name().to_string_lossy()).is_ok()
                {
                    let info = entry.path().join("source-info.json");
                    if fs::metadata(&info)
                        .and_then(|metadata| metadata.modified())
                        .ok()
                        .and_then(|time| time.elapsed().ok())
                        .is_some_and(|age| age > Duration::from_secs(24 * 3600))
                    {
                        let _ = fs::remove_file(info);
                    }
                }
            }
        }
        let settings = settings::load(&data)?;
        let history = list(&data.join("history.json"), 300)
            .into_iter()
            .filter(|v| v["id"].is_string() && v["files"].is_array())
            .collect();
        let profiles = list(&data.join("profiles.json"), 12);
        let scripts = read_json(&data.join("scripts.json"), 65536)
            .ok()
            .filter(Value::is_object)
            .unwrap_or(json!({}));
        Ok(Arc::new(Self {
            app,
            tools: Tools { root, data },
            store: Mutex::new(Store {
                settings,
                history,
                profiles,
                scripts,
            }),
            jobs: Mutex::new(VecDeque::new()),
            inspection: Mutex::new(None),
            updating: AtomicBool::new(false),
            offered_release: Mutex::new(None),
            release_cache: tokio::sync::Mutex::new(None),
            cookie_gate: tokio::sync::Mutex::new(()),
            power: Mutex::new(None),
            media_cache: Mutex::new(VecDeque::new()),
        }))
    }
    pub fn settings(&self) -> Settings {
        self.store.lock().unwrap().settings.clone()
    }
    pub fn local(&self, text: &str) -> String {
        static COPY: LazyLock<Value> = LazyLock::new(|| {
            serde_json::from_str(include_str!("../../src/engine-copy.json")).unwrap()
        });
        let language = self.settings().text("language").to_owned();
        let index = ["tr", "en", "ru", "de"]
            .iter()
            .position(|v| *v == language)
            .unwrap_or(1);
        COPY[text][index].as_str().unwrap_or(text).into()
    }
    pub fn save(&self, next: &Value) -> Result<Settings> {
        let mut store = self.store.lock().unwrap();
        let next = store.settings.validate(next)?;
        write_json(&self.tools.data.join("settings.json"), &next.0)?;
        store.settings = next.clone();
        Ok(next)
    }
    pub fn event(&self, job: &Job, kind: &str, mut data: Value) {
        data["jobId"] = json!(job.id());
        data["type"] = json!(kind);
        if let Some(detail) = data["detail"].as_str() {
            data["detail"] = json!(self.local(&redact_diagnostic(detail)));
        }
        let _ = self.app.emit_to("main", "download:event", data.clone());
        if matches!(kind, "complete" | "failed") && self.settings().flag("systemNotifications") {
            use tauri_plugin_notification::NotificationExt;
            let title = self.local(if kind == "complete" {
                "İndirme tamamlandı"
            } else {
                "İndirme başarısız"
            });
            let _ = self
                .app
                .notification()
                .builder()
                .title(title)
                .body(job.title.lock().unwrap().clone())
                .show();
        }
    }
    pub async fn tool(&self, name: &str, args: &[&str]) -> Option<String> {
        let file = self.tools.get(name).ok()?;
        let args = args.iter().map(|v| v.to_string()).collect::<Vec<_>>();
        process::run(
            &file,
            &args,
            &Cancel::new(),
            Options {
                timeout: Duration::from_secs(12),
                max_output: 65536,
                ..Default::default()
            },
        )
        .await
        .ok()?
        .success()
        .ok()?
        .stdout
        .lines()
        .next()
        .map(str::to_owned)
    }
    pub fn cancel_inspection(&self, id: Option<&str>) -> bool {
        let current = self.inspection.lock().unwrap();
        if let Some((key, cancel)) = current.as_ref() {
            if id.is_none_or(|id| key == id) {
                cancel.cancel();
                return true;
            }
        }
        false
    }
    fn media_key(&self, url: &str, settings: &Settings) -> String {
        let keys = [
            "playlist",
            "ipMode",
            "proxyUrl",
            "socketTimeout",
            "userAgent",
            "refererUrl",
            "extractorRetries",
            "extractorArgs",
            "sleepRequests",
            "cookieMode",
            "cookieBrowser",
        ];
        let cookie_stamp = fs::metadata(self.tools.data.join("session-cookies.txt"))
            .and_then(|m| m.modified())
            .ok()
            .and_then(|stamp| stamp.duration_since(UNIX_EPOCH).ok())
            .map(|age| age.as_nanos().to_string());
        json!([url, keys.map(|key| &settings.0[key]), cookie_stamp]).to_string()
    }
    fn cached_media(&self, key: &str) -> Option<Arc<Value>> {
        let mut cache = self.media_cache.lock().unwrap();
        cache.retain(|(_, time, _)| time.elapsed() < Duration::from_secs(90));
        cache
            .iter()
            .find(|(id, _, _)| id == key)
            .map(|(_, _, data)| data.clone())
    }
    pub async fn inspect(&self, raw: &str, id: String, playlist: bool) -> Result<Value> {
        if self.updating.load(Ordering::SeqCst) {
            return Err("yt-dlp is updating. Please wait.".into());
        }
        let url = settings::url(raw)?;
        let current = self.settings();
        let cancel = Cancel::new();
        {
            let mut active = self.inspection.lock().unwrap();
            if self.updating.load(Ordering::SeqCst) {
                return Err("yt-dlp is updating. Please wait.".into());
            }
            if let Some((_, old)) = active.take() {
                old.cancel();
            }
            *active = Some((id.clone(), cancel.clone()));
        }
        let result=async{
            let key=self.media_key(&url,&current);
            let data=match (!playlist&&!current.flag("playlist")).then(||self.cached_media(&key)).flatten(){
                Some(data)=>data,
                None=>{
                    let mut args=arguments::base(&current,&self.tools)?;
                    args.extend(["--dump-single-json".into(),"--skip-download".into()]);
                    if playlist||current.flag("playlist"){args.extend(["--yes-playlist","--flat-playlist","--playlist-end",if playlist{"200"}else{"1"}].map(String::from));}else{args.push("--no-playlist".into());}
                    args.push(url.clone());
                    let output=process::run(&self.tools.get("yt-dlp.exe")?,&args,&cancel,Options{timeout:Duration::from_secs(90),max_output:16*1024*1024,..Default::default()}).await?.success()?;
                    let data:Arc<Value>=Arc::new(serde_json::from_str(&output.stdout).map_err(|e|e.to_string())?);
                    if !playlist&&!current.flag("playlist")&&data["formats"].is_array()&&current.text("cookieMode")!="browser"{
                        let mut cache=self.media_cache.lock().unwrap();cache.retain(|(id,time,_)|id!=&key&&time.elapsed()<Duration::from_secs(90));
                        cache.push_front((key,Instant::now(),data.clone()));cache.truncate(4);
                    }
                    data
                }
            };
            if playlist{
                let entries=data["entries"].as_array().map(|entries|entries.iter().take(200).enumerate().map(|(index,entry)|{
                    json!({"index":entry["playlist_index"].as_u64().filter(|v|*v>0).unwrap_or(index as u64+1),"title":entry["title"].as_str().or(entry["id"].as_str()).unwrap_or("Media").chars().take(300).collect::<String>()})
                }).collect::<Vec<_>>()).unwrap_or_default();
                return Ok(json!({"title":data["title"].as_str().unwrap_or(""),"entries":entries}));
            }
            let formats:Vec<SourceFormat>=data["formats"].as_array().map(|v|v.iter().filter_map(|v|serde_json::from_value(v.clone()).ok()).collect()).unwrap_or_default();
            let choices=video_choices(&formats,current.text("videoContainer"),current.text("videoCodec"));
            let thumbnail=data["thumbnail"].as_str().or_else(||data["thumbnails"].as_array()?.last()?["url"].as_str());
            Ok(json!({"title":data["title"],"uploader":data["uploader"].as_str().or(data["channel"].as_str()),"duration":data["duration"],
            "thumbnail":thumbnail,"formats":choices,"isPlaylist":data["_type"]=="playlist"||data["entries"].is_array()||url::Url::parse(&url).unwrap().query_pairs().any(|(k,_)|k=="list")}))
        }.await;
        {
            let mut active = self.inspection.lock().unwrap();
            if active.as_ref().is_some_and(|(key, _)| key == &id) {
                *active = None;
            }
        }
        result.map_err(|e: String| self.local(&redact_diagnostic(&e)))
    }
    pub fn start(self: &Arc<Self>, request: &Value) -> Result<Value> {
        if self.updating.load(Ordering::SeqCst) {
            return Err("yt-dlp is updating. Please wait.".into());
        }
        let download = Download::from_request(request, &self.settings())?;
        for tool in ["yt-dlp.exe", "ffmpeg.exe", "ffprobe.exe", "deno.exe"] {
            self.tools.get(tool)?;
        }
        let mut jobs = self.jobs.lock().unwrap();
        if self.updating.load(Ordering::SeqCst) {
            return Err("yt-dlp is updating. Please wait.".into());
        }
        if let Some(existing) = jobs.iter().find(|j| j.download.key() == download.key()) {
            return Ok(json!({"id":existing.id(),"duplicate":true}));
        }
        if jobs.len() >= 100 {
            return Err("The queue supports up to 100 downloads.".into());
        }
        let id = download.job["id"].as_str().unwrap().to_owned();
        let work = self.tools.data.join("work").join(&id);
        download.args(&self.tools, &work, false, false, false)?;
        fs::create_dir_all(&work).map_err(|e| e.to_string())?;
        let scripts = self.store.lock().unwrap().scripts.clone();
        let title = Mutex::new(download.job["title"].as_str().unwrap_or("Media").to_owned());
        let job = Arc::new(Job {
            download,
            cancel: Cancel::new(),
            state: AtomicU8::new(0),
            committing: AtomicBool::new(false),
            work,
            scripts,
            title,
        });
        self.event(&job,"queued",json!({"title":job.download.job["title"],"url":job.download.job["url"],"thumbnail":job.download.job["thumbnail"],"kind":job.download.job["kind"],"phase":"queued","percent":0}));
        jobs.push_back(job);
        drop(jobs);
        self.pump();
        Ok(json!({"id":id}))
    }
    pub fn pump(self: &Arc<Self>) {
        if self.updating.load(Ordering::SeqCst) {
            return;
        }
        let limit = self.settings().number("maxDownloads") as usize;
        let jobs = self.jobs.lock().unwrap();
        let mut running = jobs
            .iter()
            .filter(|j| j.state.load(Ordering::SeqCst) == 1)
            .count();
        for job in jobs.iter() {
            if running >= limit {
                break;
            }
            if job
                .state
                .compare_exchange(0, 1, Ordering::SeqCst, Ordering::SeqCst)
                .is_err()
            {
                continue;
            }
            running += 1;
            let engine = self.clone();
            let job = job.clone();
            tauri::async_runtime::spawn(async move {
                let result = engine.download(&job).await;
                if let Err(error) = result {
                    let _ = fs::remove_file(job.work.join("source-info.json"));
                    if job.cancel.cancelled() {
                        let _ = fs::remove_dir_all(&job.work);
                        engine.event(&job, "cancelled", json!({"detail":"İptal edildi."}));
                    } else {
                        let recovery = media::recover(&engine.tools, &job.work, job.id());
                        engine.event(
                            &job,
                            "failed",
                            json!({"detail":redact_diagnostic(&error),"recoveryPath":recovery}),
                        );
                    }
                }
                job.state.store(2, Ordering::SeqCst);
                engine.jobs.lock().unwrap().retain(|j| j.id() != job.id());
                engine.pump();
            });
        }
        let required = running > 0 && self.settings().flag("preventSleep");
        let mut power = self.power.lock().unwrap();
        if required && power.is_none() {
            *power = Some(crate::shell::SleepGuard::new(true));
        }
        if !required {
            *power = None;
        }
    }
    pub fn cancel(self: &Arc<Self>, id: &str) -> bool {
        let jobs = self.jobs.lock().unwrap();
        let Some(job) = jobs.iter().find(|j| j.id() == id) else {
            return false;
        };
        if job.committing.load(Ordering::SeqCst) || job.state.load(Ordering::SeqCst) == 2 {
            return false;
        }
        job.cancel.cancel();
        if job.state.load(Ordering::SeqCst) == 0 {
            let job = job.clone();
            job.state.store(2, Ordering::SeqCst);
            let _ = fs::remove_dir_all(&job.work);
            self.event(&job, "cancelled", json!({"detail":"İptal edildi."}));
            drop(jobs);
            self.jobs.lock().unwrap().retain(|j| j.id() != id);
            self.pump();
        } else {
            self.event(job, "cancelling", json!({"detail":"İptal ediliyor…"}));
        }
        true
    }
    async fn script(&self, job: &Job, phase: &str, files: &[PathBuf]) -> Result<Option<String>> {
        let settings = &job.download.settings;
        let key = if phase == "before" {
            "scriptBeforeEnabled"
        } else {
            "scriptAfterEnabled"
        };
        if !settings.flag(key) {
            return Ok(None);
        }
        let result = async {
            let file = PathBuf::from(
                job.scripts[phase]
                    .as_str()
                    .ok_or("Script file was not selected.")?,
            );
            if !file.is_absolute()
                || file
                    .extension()
                    .is_none_or(|ext| !ext.eq_ignore_ascii_case("ps1"))
                || !file.is_file()
            {
                return Err("Choose a valid PowerShell script.".into());
            }
            let system = PathBuf::from(
                std::env::var_os("SystemRoot").ok_or("Windows directory is unavailable.")?,
            );
            let args = vec![
                "-NoLogo".into(),
                "-NoProfile".into(),
                "-NonInteractive".into(),
                "-File".into(),
                file.to_string_lossy().into_owned(),
            ];
            let env = vec![
                ("ZENITHW_EVENT".into(), phase.into()),
                (
                    "ZENITHW_URL".into(),
                    job.download.job["url"].as_str().unwrap().into(),
                ),
                (
                    "ZENITHW_OUTPUT_DIR".into(),
                    settings.text("downloadFolder").into(),
                ),
                (
                    "ZENITHW_FILES_JSON".into(),
                    serde_json::to_string(files).unwrap(),
                ),
            ];
            process::run(
                &system.join("System32/WindowsPowerShell/v1.0/powershell.exe"),
                &args,
                &job.cancel,
                Options {
                    timeout: Duration::from_secs(settings.number("scriptTimeout")),
                    max_output: 65536,
                    cwd: file.parent().map(Path::to_path_buf),
                    env,
                    ..Default::default()
                },
            )
            .await?
            .success()?;
            Ok::<_, String>(())
        }
        .await;
        match result {
            Ok(()) => Ok(None),
            Err(error)
                if job.cancel.cancelled()
                    || (phase == "before" && settings.text("scriptPolicy") == "stop") =>
            {
                Err(error)
            }
            Err(_) => Ok(Some(
                if phase == "before" {
                    "Before-download script did not complete."
                } else {
                    "Media was saved; the after-download script did not complete."
                }
                .into(),
            )),
        }
    }
    async fn download(self: &Arc<Self>, job: &Arc<Job>) -> Result<()> {
        let mut started = job.download.job.clone();
        started["phase"] = json!("preparing");
        started["percent"] = json!(0);
        self.event(job, "started", started);
        let before = self.script(job, "before", &[]).await?;
        let mut native = false;
        let mut refreshed = false;
        let mut restarted = false;
        let mut attempt = 0;
        let output = loop {
            let mut args =
                job.download
                    .args(&self.tools, &job.work, native, restarted, refreshed)?;
            let source_info = job.work.join("source-info.json");
            if attempt == 0
                && !job.download.settings.flag("playlist")
                && job.download.job["trim"].is_null()
            {
                let key = self.media_key(
                    job.download.job["url"].as_str().unwrap(),
                    &job.download.settings,
                );
                if let Some(info) = self
                    .cached_media(&key)
                    .filter(|info| info["formats"].as_array().is_some_and(|v| !v.is_empty()))
                {
                    if write_json(&source_info, &info).is_ok() {
                        args.pop();
                        args.extend([
                            "--load-info-json".into(),
                            source_info.to_string_lossy().into_owned(),
                        ]);
                    }
                }
            }
            let tracker = Arc::new(Mutex::new(Tracker::default()));
            let engine = self.clone();
            let tracked = job.clone();
            let callback = Arc::new(move |line: &str, _is_error: bool| {
                if let Some(mut event) = tracker.lock().unwrap().line(line) {
                    if let Some(title) = event["title"].as_str().filter(|v| !v.is_empty()) {
                        *tracked.title.lock().unwrap() = title.to_owned();
                    }
                    event["attempt"] = json!(attempt);
                    engine.event(&tracked, "progress", event);
                }
            });
            let output = process::run(
                &self.tools.get("yt-dlp.exe")?,
                &args,
                &job.cancel,
                Options {
                    timeout: Duration::from_secs(7 * 24 * 3600),
                    max_output: 65536,
                    on_line: Some(callback),
                    ..Default::default()
                },
            )
            .await;
            let _ = fs::remove_file(source_info);
            let output = output?;
            let diagnostic = format!("{}{}", output.stderr, output.stdout);
            let retry = download_retry(
                attempt,
                output.code,
                &diagnostic,
                job.download.settings.flag("useAria2") && !native,
                refreshed,
                restarted,
            );
            match retry {
                Some(reason) => {
                    attempt += 1;
                    native = true;
                    refreshed = true;
                    restarted = reason == Retry::RestartNativeWithoutPartial;
                    self.event(job,"progress",json!({"phase":"preparing","percent":0,"attempt":attempt,"detail":if reason==Retry::NativeAfterAria2{"Aria2 başarısız; normal indirme deneniyor…"}else{"İndirme bağlantısı yenileniyor…"}}));
                }
                None => break output,
            }
        };
        if job.cancel.cancelled() {
            return Err("Cancelled.".into());
        }
        let mut cover_warning = false;
        if job.download.settings.flag("embedThumbnail") {
            self.event(job,"progress",json!({"phase":"processing","percent":null,"detail":"Kapak kareye dönüştürülüyor…"}));
            for file in media::files(&job.work)?
                .into_iter()
                .filter(|p| media::is_media(p) && !media::partial(p))
            {
                match media::square_cover(&self.tools, &file, &job.cancel).await {
                    Ok(true) if !job.download.settings.flag("writeThumbnail") => {
                        for ext in ["jpg", "jpeg", "png", "webp"] {
                            let _ = fs::remove_file(file.with_extension(ext));
                        }
                    }
                    Ok(_) => {}
                    Err(_) if job.cancel.cancelled() => return Err("Cancelled.".into()),
                    Err(_) => cover_warning = true,
                }
            }
        }
        if job.cancel.cancelled() {
            return Err("Cancelled.".into());
        }
        job.committing.store(true, Ordering::SeqCst);
        self.event(job,"progress",json!({"phase":"processing","percent":null,"detail":"Dosya doğrulanıyor ve kaydediliyor…"}));
        let published = media::publish(&self.tools, &job.download, &job.work, &job.cancel).await?;
        if !published.files.is_empty() {
            let recovery = if published.retained_media {
                media::recover(&self.tools, &job.work, job.id())
            } else {
                None
            };
            let after = self
                .script(job, "after", &published.files)
                .await
                .unwrap_or_else(|_| {
                    Some("Media was saved; the after-download script did not complete.".into())
                });
            let warning = published.warning
                || output.code != Some(0)
                || cover_warning
                || before.is_some()
                || after.is_some();
            let result = json!({"id":job.id(),"title":job.title.lock().unwrap().clone(),"thumbnail":job.download.job["thumbnail"],"kind":job.download.job["kind"],
            "createdAt":SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64,"files":published.files,"warning":warning,"recoveryPath":recovery});
            {
                let mut store = self.store.lock().unwrap();
                store.history.insert(0, result);
                store.history.truncate(300);
                let _ = write_json(&self.tools.data.join("history.json"), &json!(store.history));
            }
            let detail = after.or(before).unwrap_or_else(|| {
                if cover_warning {
                    "Kare kapak hazırlanamadı; özgün kapak korundu."
                } else if warning {
                    "Medya kaydedildi; isteğe bağlı son işlem tamamlanamadı."
                } else {
                    "Kaydedildi"
                }
                .into()
            });
            self.event(job,"complete",json!({"detail":detail,"warning":warning,"files":published.files.iter().map(|p|p.file_name().unwrap().to_string_lossy()).collect::<Vec<_>>()}));
            if recovery.is_none() {
                self.cleanup(job);
            }
        } else if output.code == Some(0)
            && output
                .stdout
                .contains("has already been recorded in the archive")
        {
            self.event(
                job,
                "complete",
                json!({"detail":"Daha önce indirildiği için tekrar atlandı.","skipped":true}),
            );
            self.cleanup(job);
        } else {
            write_json(
                &job.work.join("failure.json"),
                &json!({"version":"5.0.0","code":output.code,"detail":redact_diagnostic(&output.stderr)}),
            )?;
            return Err(if output.stderr.trim().is_empty() {
                "No verified media file was produced.".into()
            } else {
                redact_diagnostic(&output.stderr)
            });
        }
        Ok(())
    }
    fn cleanup(&self, job: &Job) {
        if job.download.settings.flag("keepFragments")
            && fs::read_dir(&job.work).is_ok_and(|mut d| d.next().is_some())
        {
            let retained = self.tools.data.join("fragments").join(job.id());
            let _ = fs::create_dir_all(retained.parent().unwrap());
            let _ = fs::rename(&job.work, retained);
        } else {
            let _ = fs::remove_dir_all(&job.work);
        }
    }
    pub async fn update(self: &Arc<Self>, channel: &str) -> Result<Value> {
        if !["stable", "nightly"].contains(&channel) {
            return Err("Invalid update channel.".into());
        }
        if self.updating.swap(true, Ordering::SeqCst) {
            return Err("yt-dlp update already running.".into());
        }
        if !self.jobs.lock().unwrap().is_empty() || self.inspection.lock().unwrap().is_some() {
            self.updating.store(false, Ordering::SeqCst);
            self.pump();
            return Err("yt-dlp cannot be updated while downloads or analysis are active.".into());
        }
        let result=async{
            let output=process::run(&self.tools.get("yt-dlp.exe")?,&["--update-to".into(),channel.into()],&Cancel::new(),Options{timeout:Duration::from_secs(240),max_output:65536,..Default::default()}).await?.success()?;
            self.save(&json!({"ytDlpChannel":channel}))?;
            Ok(json!({"channel":channel,"version":self.tool("yt-dlp.exe",&["--version"]).await,"detail":redact_diagnostic(&(output.stdout+&output.stderr))}))
        }.await;
        self.updating.store(false, Ordering::SeqCst);
        self.pump();
        result
    }
    pub fn shutdown(&self) {
        self.cancel_inspection(None);
        for job in self.jobs.lock().unwrap().iter() {
            job.cancel.cancel();
            let _ = fs::remove_file(job.work.join("source-info.json"));
        }
        self.media_cache.lock().unwrap().clear();
        *self.power.lock().unwrap() = None;
    }
}
