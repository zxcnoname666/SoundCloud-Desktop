#![windows_subsystem = "windows"]

use std::{env, fs, path::Path, process::Command};

fn main() {
    let args: Vec<String> = env::args().collect();

    // sc-rename app.asar packed.asar.temp run.exe
    if args.len() < 4 {
        println!("must be 3 args");
        return;
    }
    
    let source: &Path = Path::new(&args[1]);
    let temp = Path::new(&args[2]);
    let run = Path::new(&args[3]);

    if !temp.exists() {
        println!("Is not exists: {:?}", temp);
        return;
    }

    if source.exists() {
        if let Err(err) = fs::remove_file(&source) {
            println!("Err #1: {}", err);
            return;
        }
    }

    if let Err(err) = fs::rename(temp, source) {
        println!("Err #2: {}", err);
    }
    
    let mut command = Command::new(run);
    
    if let Ok(mut process) = command.spawn() {
        match process.wait() {
            Ok(res) => {
                println!("Command: {}", res);
            },
            Err(err) => {
                println!("Err #3: {}", err);
            }
        }
    }
}
