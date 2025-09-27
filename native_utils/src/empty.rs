use napi_derive::napi;

#[napi]
#[allow(dead_code)]
fn set_efficiency(_pid: u32, _value: bool) { }

#[napi]
#[allow(dead_code)]
fn get_efficiency(_pid: u32) -> bool {
    false
}


#[napi]
#[allow(dead_code)]
fn protocol_inject(_path: String) { }


#[napi]
#[allow(dead_code)]
fn sleeper(_value: bool) { }