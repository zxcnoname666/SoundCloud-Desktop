use std::mem;

use napi_derive::napi;
use windows::{
    core::{s, PCSTR},
    Win32::System::Registry::{RegCloseKey, RegCreateKeyA, RegDeleteTreeA, RegSetValueExA, HKEY, HKEY_CURRENT_USER, REG_SZ}
};

const TAG: &str = "sc";


#[napi]
#[allow(dead_code)]
unsafe fn protocol_inject(path: String) {
    let root = format!("Software\\Classes\\{}", TAG);

    let reg_status = RegDeleteTreeA(
        HKEY_CURRENT_USER,
        PCSTR::from_raw(root.as_ptr())
    );
    
    if reg_status.is_ok() {
        println!("Removed reg tree: {}", root);
    } else {
        println!("Remove tree err: {:?}", reg_status);
    }


    let mut reg_key: HKEY = mem::zeroed();
    let reg_status = RegCreateKeyA(
        HKEY_CURRENT_USER,
        PCSTR::from_raw(root.as_ptr()),
        &mut reg_key
    );

    if !reg_status.is_ok() {
        println!("Create reg tree error: {:?}", reg_status);
        return;
    }


    let reg_status = RegSetValueExA(
        reg_key,
        s!("URL Protocol"),
        0,
        REG_SZ,
        Some("".as_bytes())
    );

    if !reg_status.is_ok() {
        println!("Create reg \"URL Protocol\" error: {:?}", reg_status);
        return;
    }


    let reg_status = RegSetValueExA(
        reg_key,
        s!(""),
        0,
        REG_SZ,
        Some(format!("URL:{}", TAG).as_bytes())
    );
    
    if !reg_status.is_ok() {
        println!("Create reg \"Default\" error: {:?}", reg_status);
        return;
    }


    let reg_status = RegCloseKey(reg_key);
    if !reg_status.is_ok() {
        println!("Close reg error: {:?}", reg_status);
        return;
    }


    let mut reg_key: HKEY = mem::zeroed();
    let reg_status = RegCreateKeyA(
        HKEY_CURRENT_USER,
        PCSTR::from_raw(format!("{}\\shell\\open\\command", root).as_ptr()),
        &mut reg_key
    );

    if !reg_status.is_ok() {
        println!("Create reg tree of shell error: {:?}", reg_status);
        return;
    }


    let reg_status = RegSetValueExA(
        reg_key,
        s!(""),
        0,
        REG_SZ,
        Some(format!("\"{}\" -site:\"%1\"", path).as_bytes())
    );
    
    if !reg_status.is_ok() {
        println!("Create reg \"Shell\" error: {:?}", reg_status);
        return;
    }


    let reg_status = RegCloseKey(reg_key);
    if !reg_status.is_ok() {
        println!("Close shell reg error: {:?}", reg_status);
        return;
    }
}