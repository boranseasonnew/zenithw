#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod arguments;
mod engine;
mod media;
mod process;
mod progress;
mod settings;
mod shell;

fn main() {
    shell::run();
}
