//! Native shell. Kept deliberately small: every command exposed to the UI is a security
//! boundary (see docs/SECURITY.md). Book content never gets access to any of it.

mod book_frame;
mod library;
mod picker;

use std::sync::Mutex;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Used from Rust only (native picker, reading the picked file). No plugin permissions
        // are granted to the UI.
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .register_uri_scheme_protocol(book_frame::SCHEME, |_ctx, request| {
            book_frame::respond(&request)
        })
        .setup(|app| {
            let root = app.path().app_data_dir()?.join("library");
            let store =
                library::store::LibraryStore::open(&root).map_err(|error| error.to_string())?;
            app.manage(library::Library(Mutex::new(store)));
            app.manage(picker::PickedFile::default());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            library::library_list,
            library::library_get,
            library::library_get_content,
            library::library_add,
            library::library_update,
            library::library_replace,
            library::library_delete,
            library::book_storage_load,
            library::book_storage_save,
            library::book_storage_delete,
            picker::pick_book_file,
            picker::read_picked_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running the application");
}
