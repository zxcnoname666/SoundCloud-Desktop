use std::fs;
use napi_derive::napi;

const PROTOCOL_NAME: &str = "sc";

#[napi]
pub fn protocol_inject(path: String) -> bool {
    // Get user's home directory
    let home_dir = match std::env::var("HOME") {
        Ok(dir) => dir,
        Err(_) => {
            eprintln!("Failed to get HOME directory");
            return false;
        }
    };

    // Create .local/share/applications directory if it doesn't exist
    let apps_dir = format!("{}/.local/share/applications", home_dir);
    if let Err(e) = fs::create_dir_all(&apps_dir) {
        eprintln!("Failed to create applications directory: {}", e);
        return false;
    }

    // Create desktop entry
    let desktop_file_path = format!("{}/soundcloud-desktop.desktop", apps_dir);
    let desktop_content = format!(
        r#"[Desktop Entry]
Type=Application
Name=SoundCloud Desktop
Exec="{}" "%u"
Icon=soundcloud
StartupNotify=true
NoDisplay=true
MimeType=x-scheme-handler/{};
"#,
        path, PROTOCOL_NAME
    );

    if let Err(e) = fs::write(&desktop_file_path, desktop_content) {
        eprintln!("Failed to write desktop file: {}", e);
        return false;
    }

    // Make desktop file executable
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(mut perms) = fs::metadata(&desktop_file_path).map(|m| m.permissions()) {
            perms.set_mode(0o755);
            let _ = fs::set_permissions(&desktop_file_path, perms);
        }
    }

    // Update MIME database
    let update_result = std::process::Command::new("update-desktop-database")
        .arg(&apps_dir)
        .output();

    match update_result {
        Ok(output) => {
            if !output.status.success() {
                eprintln!("Warning: Failed to update desktop database: {}", 
                    String::from_utf8_lossy(&output.stderr));
            }
        }
        Err(e) => {
            eprintln!("Warning: Failed to run update-desktop-database: {}", e);
        }
    }

    // Register as default handler for the protocol
    let xdg_result = std::process::Command::new("xdg-mime")
        .args(&["default", "soundcloud-desktop.desktop", &format!("x-scheme-handler/{}", PROTOCOL_NAME)])
        .output();

    match xdg_result {
        Ok(output) => {
            if !output.status.success() {
                eprintln!("Warning: Failed to set default handler: {}", 
                    String::from_utf8_lossy(&output.stderr));
            }
        }
        Err(e) => {
            eprintln!("Warning: Failed to run xdg-mime: {}", e);
        }
    }

    println!("Successfully registered {} protocol on Linux", PROTOCOL_NAME);
    true
}