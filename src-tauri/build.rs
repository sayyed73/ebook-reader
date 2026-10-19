use std::{env, fs, path::Path};

/// Commands the frontend may call. Each one gets a generated `allow-*` permission that must be
/// granted in `capabilities/`, so nothing is callable unless listed there.
const COMMANDS: &[&str] = &[
    "library_list",
    "library_get",
    "library_get_content",
    "library_add",
    "library_update",
    "library_replace",
    "library_delete",
    "book_storage_load",
    "book_storage_save",
    "book_storage_delete",
    "pick_book_file",
    "read_picked_file",
];

fn main() {
    embed_frame_page();
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(COMMANDS)),
    )
    .expect("failed to run tauri-build");
}

/// Copies the built frame page (`dist/frame.html`, produced by the Vite build) into the binary.
/// It is served only via the `bookframe` protocol, never through Tauri's asset protocol, which
/// would inject the app's CSP and block book scripts. Without a build, a placeholder that runs
/// no book code is embedded instead (fail closed).
fn embed_frame_page() {
    let source = Path::new("../dist/frame.html");
    println!("cargo:rerun-if-changed={}", source.display());
    let out = Path::new(&env::var("OUT_DIR").expect("OUT_DIR is set by cargo")).join("frame.html");
    let page = fs::read(source).unwrap_or_else(|_| {
        println!("cargo:warning=dist/frame.html not found; run the frontend build first. Embedding a placeholder.");
        b"<!doctype html><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'\"><p>Reader frame not built.</p>".to_vec()
    });
    fs::write(out, page).expect("failed to write the embedded frame page");
}
