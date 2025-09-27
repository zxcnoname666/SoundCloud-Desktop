use std::mem;
use napi_derive::napi;
use windows::{
    core::{s, PCSTR},
    Win32::System::Registry::{RegCloseKey, RegCreateKeyA, RegDeleteTreeA, RegSetValueExA, HKEY, HKEY_CURRENT_USER, REG_SZ}
};

const PROTOCOL_NAME: &str = "sc";

#[napi]
pub fn protocol_inject(path: String) -> bool {
    let root = format!("Software\\Classes\\{}", PROTOCOL_NAME);
    let root_cstr = format!("{}\0", root);
    let root_ptr = root_cstr.as_ptr();
    let root_pcstr = PCSTR::from_raw(root_ptr);

    // Validate the path
    unsafe {
        if root_pcstr.to_string().unwrap_or_default() != root {
            eprintln!("Invalid registry path");
            return false;
        }
    }

    // Remove existing registration
    unsafe {
        let _ = RegDeleteTreeA(HKEY_CURRENT_USER, root_pcstr);
    }

    // Create main protocol key
    let mut main_key: HKEY = unsafe { mem::zeroed() };
    let result = unsafe { RegCreateKeyA(HKEY_CURRENT_USER, root_pcstr, &mut main_key) };
    
    if !result.is_ok() {
        eprintln!("Failed to create main registry key: {:?}", result);
        return false;
    }

    // Set URL Protocol marker
    let url_protocol_result = unsafe {
        RegSetValueExA(
            main_key,
            s!("URL Protocol"),
            Some(0),
            REG_SZ,
            Some("".as_bytes())
        )
    };

    if !url_protocol_result.is_ok() {
        unsafe { RegCloseKey(main_key); }
        eprintln!("Failed to set URL Protocol: {:?}", url_protocol_result);
        return false;
    }

    // Set default description
    let desc_result = unsafe {
        RegSetValueExA(
            main_key,
            s!(""),
            Some(0),
            REG_SZ,
            Some(format!("URL:{} Protocol", PROTOCOL_NAME).as_bytes())
        )
    };

    if !desc_result.is_ok() {
        unsafe { RegCloseKey(main_key); }
        eprintln!("Failed to set description: {:?}", desc_result);
        return false;
    }

    unsafe { RegCloseKey(main_key); }

    // Create shell command key
    let command_path = format!("{}\\shell\\open\\command\0", root);
    let command_ptr = command_path.as_ptr();
    let command_pcstr = PCSTR::from_raw(command_ptr);

    let mut command_key: HKEY = unsafe { mem::zeroed() };
    let command_result = unsafe {
        RegCreateKeyA(HKEY_CURRENT_USER, command_pcstr, &mut command_key)
    };

    if !command_result.is_ok() {
        eprintln!("Failed to create command key: {:?}", command_result);
        return false;
    }

    // Set command
    let cmd = format!("\"{}\" \"%1\"", path);
    let cmd_result = unsafe {
        RegSetValueExA(
            command_key,
            s!(""),
            Some(0),
            REG_SZ,
            Some(cmd.as_bytes())
        )
    };

    if !cmd_result.is_ok() {
        unsafe { RegCloseKey(command_key); }
        eprintln!("Failed to set command: {:?}", cmd_result);
        return false;
    }

    unsafe { RegCloseKey(command_key); }

    println!("Successfully registered {} protocol", PROTOCOL_NAME);
    true
}