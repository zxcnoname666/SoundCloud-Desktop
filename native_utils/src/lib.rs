#[cfg(target_os = "windows")]
mod windows_protocol;

#[cfg(target_os = "linux")]
mod linux_protocol;

#[cfg(target_os = "macos")]
mod macos_protocol;

#[cfg(target_os = "windows")]
pub use windows_protocol::*;

#[cfg(target_os = "linux")]
pub use linux_protocol::*;

#[cfg(target_os = "macos")]
pub use macos_protocol::*;