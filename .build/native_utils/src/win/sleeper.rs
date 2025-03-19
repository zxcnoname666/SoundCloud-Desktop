use std::sync::Mutex;
use napi_derive::napi;
use windows::{
    core::PWSTR,
    Win32::{
        Foundation::{CloseHandle, HANDLE},
        System::{
            Power::{
                PowerClearRequest, PowerCreateRequest, PowerSetRequest,
                PowerRequestDisplayRequired, PowerRequestSystemRequired
            },
            Threading::{POWER_REQUEST_CONTEXT_FLAGS, REASON_CONTEXT}
        }
    }
};

static mut REQUEST: Mutex<Option<HANDLE>> = Mutex::new(None);


#[napi]
#[allow(dead_code)]
unsafe fn sleeper(value: bool) {
    let request_option = REQUEST.lock().unwrap().take();

    if value {
        if request_option.is_none() {
            let mut context = REASON_CONTEXT {
                Version: 0,
                Flags: POWER_REQUEST_CONTEXT_FLAGS(1),
                ..Default::default()
            };
            let mut buf: Vec<u16> = String::from("SoundCloud Playing").encode_utf16().chain(Some(0)).collect();
            context.Reason.SimpleReasonString = PWSTR::from_raw(buf.as_mut_ptr());

            let handle = match PowerCreateRequest(&context) {
                Ok(resp) => resp,
                Err(err) => {
                    println!("Err: {}", err);
                    return;
                }
            };

            REQUEST.lock().unwrap().replace(handle);
        }

        if let Some(handle) = request_option {
            if let Err(err) = PowerSetRequest(handle, PowerRequestSystemRequired) {
                println!("Err: {}", err);
            }

            if let Err(err) = PowerSetRequest(handle, PowerRequestDisplayRequired) {
                println!("Err: {}", err);
            }
        }

    } else {

        if let Some(handle) = request_option {
            if let Err(err) = PowerClearRequest(handle, PowerRequestSystemRequired) {
                println!("Err: {}", err);
            }
            
            if let Err(err) = PowerClearRequest(handle, PowerRequestDisplayRequired) {
                println!("Err: {}", err);
            }
            
            if let Err(err) = CloseHandle(handle) {
                println!("Err: {}", err);
            }

            REQUEST.lock().unwrap().take();
        }
        
    }
}