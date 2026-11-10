fn main() {
    // The Windows GUI thread also runs WebView2 and native IPC callbacks.
    if std::env::var("CARGO_CFG_TARGET_ENV").as_deref() == Ok("msvc") {
        println!("cargo:rustc-link-arg-bin=zenithw-desktop=/STACK:8388608");
    }
    tauri_build::build()
}
