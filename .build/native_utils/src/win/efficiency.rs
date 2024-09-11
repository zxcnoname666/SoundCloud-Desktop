use napi_derive::napi;
use std::os::raw::c_void;
use windows::Win32::{
    Foundation::{CloseHandle, HANDLE}, System::Threading::*
};

#[napi]
#[allow(dead_code)]
unsafe fn set_efficiency(pid: u32, value: bool) {
    let handle = OpenProcess(PROCESS_ALL_ACCESS, false, pid);

    if let Ok(process) = handle {
        if value {
            enable_ecoqos(process);
        } else {
            disable_ecoqoc(process);
        }

        _ = CloseHandle(process);
    }
}

#[napi]
#[allow(dead_code)]
unsafe fn get_efficiency(pid: u32) -> bool {
    let handle = OpenProcess(PROCESS_ALL_ACCESS, false, pid);

    if let Ok(process) = handle {
        let ret = GetPriorityClass(process) == IDLE_PRIORITY_CLASS.0;
        _ = CloseHandle(process);
        return ret;
    }

    false
}

unsafe fn enable_ecoqos(process: HANDLE)
{
    let state = PROCESS_POWER_THROTTLING_STATE { 
        Version: PROCESS_POWER_THROTTLING_CURRENT_VERSION,
        ControlMask: PROCESS_POWER_THROTTLING_EXECUTION_SPEED,
        StateMask: PROCESS_POWER_THROTTLING_EXECUTION_SPEED
    };
    let state_pointer: *const c_void = std::ptr::addr_of!(state).cast();

    let result = SetProcessInformation(process, ProcessPowerThrottling, state_pointer, std::mem::size_of::<PROCESS_POWER_THROTTLING_STATE>() as u32);
    if let Err(err) = result {
        println!("Err: {}", err);
    }

    let result = SetPriorityClass(process, IDLE_PRIORITY_CLASS);
    if let Err(err) = result {
        println!("Err: {}", err);
    }
}

unsafe fn disable_ecoqoc(process: HANDLE)
{
    let result = SetPriorityClass(process, NORMAL_PRIORITY_CLASS);
    if let Err(err) = result {
        println!("Err: {}", err);
    }
}