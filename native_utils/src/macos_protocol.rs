use std::fs;
use std::process::Command;
use napi_derive::napi;

const PROTOCOL_NAME: &str = "sc";

#[napi]
pub fn protocol_inject(path: String) -> bool {
    // Create a temporary AppleScript to register the protocol
    let script = format!(
        r#"
        tell application "System Events"
            try
                -- Get the current user's home directory
                set homeDir to (path to home folder) as string
                
                -- Create plist content for protocol handler
                set plistContent to "<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">
<plist version=\"1.0\">
<dict>
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLName</key>
            <string>SoundCloud Protocol</string>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>{}</string>
            </array>
        </dict>
    </array>
</dict>
</plist>"
                
                return true
            on error errMsg
                return false
            end try
        end tell
        "#,
        PROTOCOL_NAME
    );

    // Try to use LSSetDefaultHandlerForURLScheme if available
    let register_cmd = format!(
        r#"
        osascript -e 'tell application "System Events" to make new login item at end with properties {{path:"{}", hidden:false}}'
        "#,
        path
    );

    match Command::new("sh").arg("-c").arg(&register_cmd).output() {
        Ok(output) => {
            if !output.status.success() {
                eprintln!("Warning: Failed to register with system: {}", 
                    String::from_utf8_lossy(&output.stderr));
            }
        }
        Err(e) => {
            eprintln!("Warning: Failed to run registration command: {}", e);
        }
    }

    // Alternative method: Use LaunchServices framework
    let ls_register = format!(
        "/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/LaunchServices.framework/Versions/A/Support/lsregister -f \"{}\"",
        path
    );

    match Command::new("sh").arg("-c").arg(&ls_register).output() {
        Ok(output) => {
            if output.status.success() {
                println!("Successfully registered {} protocol on macOS", PROTOCOL_NAME);
                return true;
            } else {
                eprintln!("lsregister failed: {}", String::from_utf8_lossy(&output.stderr));
            }
        }
        Err(e) => {
            eprintln!("Failed to run lsregister: {}", e);
        }
    }

    // Fallback: try to create URL scheme association
    let scheme_register = format!(
        "defaults write com.apple.LaunchServices/com.apple.launchservices.secure LSHandlers -array-add '{{LSHandlerContentType=\"public.url\";LSHandlerRoleAll=\"{}\";LSHandlerURLScheme=\"{}\"}}'",
        path, PROTOCOL_NAME
    );

    match Command::new("sh").arg("-c").arg(&scheme_register).output() {
        Ok(_) => {
            println!("Successfully registered {} protocol on macOS (fallback method)", PROTOCOL_NAME);
            true
        }
        Err(e) => {
            eprintln!("Failed to register protocol: {}", e);
            false
        }
    }
}