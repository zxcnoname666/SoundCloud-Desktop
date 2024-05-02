use napi_derive::napi;
use std::os::raw::c_void;
use windows::Win32::{Foundation::HANDLE, System::Threading::*};

#[napi]
unsafe fn efficiency(pid: u32) {
    let handle = OpenProcess(PROCESS_ALL_ACCESS, false, pid);

    if let Ok(process) = handle {
        enable_ecoqos(process);
        set_process_priority(process);
    }
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
}

unsafe fn set_process_priority(process: HANDLE)
{
    let result = SetPriorityClass(process, IDLE_PRIORITY_CLASS);
    if let Err(err) = result {
        println!("Err: {}", err);
    }
}