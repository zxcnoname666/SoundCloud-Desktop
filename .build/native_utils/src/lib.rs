#[cfg(target_os = "windows")]
#[path = "win/_init.rs"]
mod init;

#[cfg(not(target_os = "windows"))]
#[path = "empty.rs"]
mod init;