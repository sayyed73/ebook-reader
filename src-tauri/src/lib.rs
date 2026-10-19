//! Native shell. Kept deliberately small: every command exposed to the UI is a security
//! boundary (see docs/SECURITY.md), so commands are added only when a feature needs them.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running the application");
}
