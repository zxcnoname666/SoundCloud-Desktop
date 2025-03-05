use std::mem;
use napi_derive::napi;
use windows::{
    core::{s, PCSTR},
    Win32::System::Registry::{RegCloseKey, RegCreateKeyA, RegDeleteTreeA, RegSetValueExA, HKEY, HKEY_CURRENT_USER, REG_SZ}
};

const TAG: &str = "sc";


#[napi]
#[allow(dead_code)]
fn protocol_inject(path: String) {
    let root = format!("Software\\Classes\\{}", TAG);

    let root_str = format!("{}\0", root);
    let ptr = root_str.as_ptr();
    let pcstr = PCSTR::from_raw(ptr);

    unsafe {
        if pcstr.to_string().unwrap_or_default() != root {
            return;
        }
    }

    let reg_status = unsafe { RegDeleteTreeA(
        HKEY_CURRENT_USER,
        pcstr
    ) };
    
    if reg_status.is_ok() {
        println!("Removed reg tree: {}", root);
    } else {
        println!("Remove tree err: {:?}", reg_status);
    }


    let mut reg_key: HKEY = unsafe { mem::zeroed() };
    let reg_status = unsafe { RegCreateKeyA(
        HKEY_CURRENT_USER,
        pcstr,
        &mut reg_key
    ) };

    if !reg_status.is_ok() {
        println!("Create reg tree error: {:?}", reg_status);
        return;
    }


    let reg_status = unsafe { RegSetValueExA(
        reg_key,
        s!("URL Protocol"),
        Some(0),
        REG_SZ,
        Some("".as_bytes())
    ) };

    if !reg_status.is_ok() {
        println!("Create reg \"URL Protocol\" error: {:?}", reg_status);
        return;
    }


    let reg_status = unsafe { RegSetValueExA(
        reg_key,
        s!(""),
        Some(0),
        REG_SZ,
        Some(format!("URL:{}", TAG).as_bytes())
    ) };
    
    if !reg_status.is_ok() {
        println!("Create reg \"Default\" error: {:?}", reg_status);
        return;
    }


    let reg_status = unsafe { RegCloseKey(reg_key) };
    if !reg_status.is_ok() {
        println!("Close reg error: {:?}", reg_status);
        return;
    }


    let mut reg_key: HKEY = unsafe { mem::zeroed() };
    let reg_command = format!("{}\\shell\\open\\command\0", root);
    let ptr = reg_command.as_ptr();
    let pcstr = PCSTR::from_raw(ptr);

    let reg_status = unsafe { RegCreateKeyA(
        HKEY_CURRENT_USER,
        pcstr,
        &mut reg_key
    ) };

    if !reg_status.is_ok() {
        println!("Create reg tree of shell error: {:?}", reg_status);
        return;
    }


    let reg_status = unsafe { RegSetValueExA(
        reg_key,
        s!(""),
        Some(0),
        REG_SZ,
        Some(format!("\"{}\" -site:\"%1\"", path).as_bytes())
    ) };
    
    if !reg_status.is_ok() {
        println!("Create reg \"Shell\" error: {:?}", reg_status);
        return;
    }


    let reg_status = unsafe { RegCloseKey(reg_key) };
    if !reg_status.is_ok() {
        println!("Close shell reg error: {:?}", reg_status);
        return;
    }
}