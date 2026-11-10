use crate::settings::Result;
use std::{
    path::{Path, PathBuf},
    process::Stdio,
    sync::Arc,
    time::Duration,
};
use tokio::{
    io::{AsyncRead, AsyncReadExt},
    process::Command,
    sync::watch,
};
use zenithw_desktop_core::retry::redact_diagnostic;

#[derive(Clone)]
pub struct Cancel(watch::Sender<bool>);
impl Cancel {
    pub fn new() -> Self {
        Self(watch::channel(false).0)
    }
    pub fn cancel(&self) {
        self.0.send_replace(true);
    }
    pub fn cancelled(&self) -> bool {
        *self.0.borrow()
    }
    async fn wait(&self) {
        let mut receiver = self.0.subscribe();
        let _ = receiver.wait_for(|value| *value).await;
    }
}
pub type OutputLine = Arc<dyn Fn(&str, bool) + Send + Sync>;
#[derive(Default)]
pub struct Options {
    pub timeout: Duration,
    pub max_output: usize,
    pub on_line: Option<OutputLine>,
    pub cwd: Option<PathBuf>,
    pub env: Vec<(String, String)>,
}
#[derive(Debug)]
pub struct Output {
    pub code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
}
impl Output {
    pub fn success(self) -> Result<Self> {
        if self.code == Some(0) {
            Ok(self)
        } else {
            let detail = redact_diagnostic(if self.stderr.trim().is_empty() {
                &self.stdout
            } else {
                &self.stderr
            });
            if detail.trim().is_empty() {
                Err(self
                    .code
                    .map(|code| format!("Media tool exited with code {code}."))
                    .unwrap_or_else(|| "Media tool stopped without an exit code.".into()))
            } else {
                Err(detail)
            }
        }
    }
}
async fn read_pipe(
    mut pipe: impl AsyncRead + Unpin,
    limit: usize,
    strict: bool,
    error: bool,
    callback: Option<OutputLine>,
) -> Result<Vec<u8>> {
    let mut output = Vec::new();
    let mut line = Vec::new();
    let mut skipped = false;
    let mut truncated = false;
    let mut chunk = vec![0u8; 8192];
    loop {
        let count = pipe.read(&mut chunk).await.map_err(|e| e.to_string())?;
        if count == 0 {
            break;
        }
        if strict && output.len() + count > limit {
            return Err("Media metadata exceeded the safe output limit.".into());
        }
        output.extend_from_slice(&chunk[..count]);
        if output.len() > limit {
            truncated = true;
            output.drain(..output.len() - limit);
        }
        if let Some(callback) = &callback {
            for &byte in &chunk[..count] {
                if matches!(byte, b'\r' | b'\n') {
                    if !skipped && !line.is_empty() {
                        callback(&String::from_utf8_lossy(&line), error);
                    }
                    line.clear();
                    skipped = false;
                } else if !skipped {
                    if line.len() >= 32768 {
                        skipped = true;
                        line.clear();
                    } else {
                        line.push(byte);
                    }
                }
            }
        }
    }
    if !skipped && !line.is_empty() {
        if let Some(callback) = callback {
            callback(&String::from_utf8_lossy(&line), error);
        }
    }
    // A partial first line could have lost its URL or secret header prefix,
    // which would prevent redaction of the retained suffix.
    if truncated {
        if let Some(index) = output.iter().position(|byte| matches!(byte, b'\r' | b'\n')) {
            output.drain(..=index);
        } else {
            output.clear();
        }
    }
    Ok(output)
}
pub async fn run(
    file: &Path,
    args: &[String],
    cancel: &Cancel,
    options: Options,
) -> Result<Output> {
    if cancel.cancelled() {
        return Err("Cancelled.".into());
    }
    let mut command = Command::new(file);
    command
        .args(args)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    if let Some(cwd) = &options.cwd {
        command.current_dir(cwd);
    }
    command.envs(options.env);
    #[cfg(windows)]
    {
        use windows::Win32::System::Threading::{CREATE_NO_WINDOW, CREATE_SUSPENDED};
        command.creation_flags((CREATE_NO_WINDOW | CREATE_SUSPENDED).0);
    }
    let mut child = command.spawn().map_err(|e| e.to_string())?;
    #[cfg(windows)]
    let _tree = ProcessTree::attach(&child)?;
    let stdout = child.stdout.take().ok_or("Child stdout is unavailable.")?;
    let stderr = child.stderr.take().ok_or("Child stderr is unavailable.")?;
    let strict = options.on_line.is_none();
    let reading = async {
        let (status, out, err) = tokio::try_join!(
            async { child.wait().await.map_err(|e| e.to_string()) },
            read_pipe(
                stdout,
                options.max_output.max(1),
                strict,
                false,
                options.on_line.clone()
            ),
            read_pipe(stderr, 65536, false, true, options.on_line),
        )?;
        Ok(Output {
            code: status.code(),
            stdout: String::from_utf8_lossy(&out).into_owned(),
            stderr: String::from_utf8_lossy(&err).into_owned(),
        })
    };
    tokio::select! {
        biased;
        _=cancel.wait()=>Err("Cancelled.".into()),
        result=reading=>result,
        _=tokio::time::sleep(options.timeout)=>Err("The operation timed out.".into()),
    }
}

// Closing the job terminates every descendant, including FFmpeg, Deno and aria2.
#[cfg(windows)]
struct ProcessTree {
    _job: std::os::windows::io::OwnedHandle,
}
#[cfg(windows)]
impl ProcessTree {
    fn attach(child: &tokio::process::Child) -> Result<Self> {
        use std::os::windows::io::FromRawHandle;
        use windows::Win32::{
            Foundation::HANDLE,
            System::JobObjects::{
                AssignProcessToJobObject, CreateJobObjectW, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
                JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JobObjectExtendedLimitInformation,
                SetInformationJobObject,
            },
        };
        let pid = child.id().ok_or("Child process has no ID.")?;
        let process = child
            .raw_handle()
            .ok_or("Child process handle is unavailable.")?;
        // The child is still suspended. The job must own it before any of its code can execute.
        unsafe {
            let handle = CreateJobObjectW(None, None).map_err(|e| e.to_string())?;
            let tree = Self {
                _job: std::os::windows::io::OwnedHandle::from_raw_handle(handle.0),
            };
            let mut info = JOBOBJECT_EXTENDED_LIMIT_INFORMATION::default();
            info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            SetInformationJobObject(
                handle,
                JobObjectExtendedLimitInformation,
                &info as *const _ as _,
                std::mem::size_of_val(&info) as u32,
            )
            .map_err(|e| e.to_string())?;
            AssignProcessToJobObject(handle, HANDLE(process)).map_err(|e| e.to_string())?;
            Self::resume(pid)?;
            Ok(tree)
        }
    }

    fn resume(pid: u32) -> Result<()> {
        use std::os::windows::io::{AsRawHandle, FromRawHandle, OwnedHandle};
        use windows::Win32::{
            Foundation::HANDLE,
            System::{
                Diagnostics::ToolHelp::{
                    CreateToolhelp32Snapshot, TH32CS_SNAPTHREAD, THREADENTRY32, Thread32First,
                    Thread32Next,
                },
                Threading::{
                    GetProcessIdOfThread, OpenThread, ResumeThread,
                    THREAD_QUERY_LIMITED_INFORMATION, THREAD_SUSPEND_RESUME,
                },
            },
        };
        // Command keeps the process handle, but not the initial thread handle.
        // A newly suspended process has a single thread before its entry point runs.
        unsafe {
            let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0)
                .map_err(|error| error.to_string())?;
            let snapshot = OwnedHandle::from_raw_handle(snapshot.0);
            let mut entry = THREADENTRY32 {
                dwSize: std::mem::size_of::<THREADENTRY32>() as u32,
                ..Default::default()
            };
            Thread32First(HANDLE(snapshot.as_raw_handle()), &mut entry)
                .map_err(|error| error.to_string())?;
            loop {
                if entry.th32OwnerProcessID == pid {
                    let thread = OpenThread(
                        THREAD_QUERY_LIMITED_INFORMATION | THREAD_SUSPEND_RESUME,
                        false,
                        entry.th32ThreadID,
                    )
                    .map_err(|error| error.to_string())?;
                    let thread = OwnedHandle::from_raw_handle(thread.0);
                    let handle = HANDLE(thread.as_raw_handle());
                    if GetProcessIdOfThread(handle) != pid {
                        return Err("Child process thread changed before it could start.".into());
                    }
                    return match ResumeThread(handle) {
                        1 => Ok(()),
                        u32::MAX => Err(std::io::Error::last_os_error().to_string()),
                        _ => Err("Child process thread had an unexpected suspend count.".into()),
                    };
                }
                entry.dwSize = std::mem::size_of::<THREADENTRY32>() as u32;
                if Thread32Next(HANDLE(snapshot.as_raw_handle()), &mut entry).is_err() {
                    break;
                }
            }
        }
        Err("Child process thread was not found.".into())
    }
}

#[cfg(all(test, windows))]
mod tests {
    use super::*;
    #[tokio::test]
    async fn bounds_output_and_cancels_processes() {
        let executable = PathBuf::from(std::env::var_os("SystemRoot").unwrap())
            .join("System32/WindowsPowerShell/v1.0/powershell.exe");
        let args = vec![
            "-NoProfile".into(),
            "-NonInteractive".into(),
            "-Command".into(),
            "'x' * 5000".into(),
        ];
        let options = Options {
            timeout: Duration::from_secs(10),
            max_output: 100,
            ..Default::default()
        };
        assert!(
            run(&executable, &args, &Cancel::new(), options)
                .await
                .unwrap_err()
                .contains("safe output limit")
        );
        let cancel = Cancel::new();
        let cloned = cancel.clone();
        tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(150)).await;
            cloned.cancel();
        });
        let args = vec![
            "-NoProfile".into(),
            "-Command".into(),
            "Start-Sleep -Seconds 60".into(),
        ];
        let options = Options {
            timeout: Duration::from_secs(10),
            max_output: 100,
            ..Default::default()
        };
        assert_eq!(
            run(&executable, &args, &cancel, options)
                .await
                .err()
                .unwrap(),
            "Cancelled."
        );
    }

    #[tokio::test]
    async fn cancellation_terminates_the_spawned_process_tree() {
        use std::os::windows::io::{AsRawHandle, FromRawHandle, OwnedHandle};
        use std::sync::Mutex;
        use windows::Win32::{
            Foundation::{HANDLE, WAIT_OBJECT_0},
            System::Threading::{OpenProcess, PROCESS_SYNCHRONIZE, WaitForSingleObject},
        };

        let executable = PathBuf::from(std::env::var_os("SystemRoot").unwrap())
            .join("System32/WindowsPowerShell/v1.0/powershell.exe");
        let args = [
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            "$p = Start-Process -FilePath (Join-Path $PSHOME 'powershell.exe') -ArgumentList '-NoProfile','-NonInteractive','-Command','Start-Sleep -Seconds 60' -WindowStyle Hidden -PassThru; Write-Output $p.Id; Start-Sleep -Seconds 60",
        ].map(String::from);
        let descendant = Arc::new(Mutex::new(None));
        let cancel = Cancel::new();
        let callback = {
            let descendant = descendant.clone();
            let cancel = cancel.clone();
            Arc::new(move |line: &str, _: bool| {
                if let Ok(pid) = line.trim().parse() {
                    // Hold a handle so PID reuse cannot make the assertion ambiguous.
                    let handle = unsafe { OpenProcess(PROCESS_SYNCHRONIZE, false, pid) }.unwrap();
                    *descendant.lock().unwrap() =
                        Some(unsafe { OwnedHandle::from_raw_handle(handle.0) });
                    cancel.cancel();
                }
            })
        };
        let options = Options {
            timeout: Duration::from_secs(15),
            max_output: 100,
            on_line: Some(callback),
            ..Default::default()
        };
        assert_eq!(
            run(&executable, &args, &cancel, options).await.unwrap_err(),
            "Cancelled."
        );
        let handle = descendant
            .lock()
            .unwrap()
            .take()
            .expect("child process never started");
        assert_eq!(
            unsafe { WaitForSingleObject(HANDLE(handle.as_raw_handle()), 5000) },
            WAIT_OBJECT_0
        );
    }
}
