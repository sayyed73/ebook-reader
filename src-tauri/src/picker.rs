//! Native file picking. The user picks a file in the system dialog; Rust reads it and hands the
//! bytes to the UI via a one-time token. The UI never supplies a path, so these commands can't
//! be used to read arbitrary files.

use std::sync::Mutex;

use serde::Serialize;
use tauri::{ipc::Response, AppHandle, Runtime, State};
use tauri_plugin_dialog::{DialogExt, FilePath};
use tauri_plugin_fs::FsExt;

/// Anything larger is rejected by the UI anyway (20 MB); this bounds memory use.
const MAX_READ_BYTES: usize = 64 * 1024 * 1024;
/// Some providers (e.g. Android content URIs) don't expose a file name.
const FALLBACK_NAME: &str = "book.html";

#[derive(Default)]
pub struct PickedFile(Mutex<Option<(u64, Vec<u8>)>>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PickedFileInfo {
    token: u64,
    name: String,
    size_bytes: usize,
    /// Stable identifier of where the file lives, used to recognise the same file later.
    location: Option<String>,
}

#[tauri::command]
pub async fn pick_book_file<R: Runtime>(
    app: AppHandle<R>,
    picked: State<'_, PickedFile>,
) -> Result<Option<PickedFileInfo>, String> {
    // Async commands run off the main thread, where a blocking dialog is allowed.
    let Some(path) = app
        .dialog()
        .file()
        .add_filter("HTML books", &["html", "htm"])
        .blocking_pick_file()
    else {
        return Ok(None);
    };
    let name = file_name(&path);
    let location = stable_location(&path);
    let bytes = app
        .fs()
        .read(path)
        .map_err(|error| format!("read failed: {}", error.kind()))?;
    let size_bytes = bytes.len();

    let mut slot = picked
        .0
        .lock()
        .map_err(|_| "picker unavailable".to_string())?;
    let token = slot.as_ref().map_or(1, |(previous, _)| previous + 1);
    // Oversized files are reported with their size but not kept; the UI rejects them.
    let kept = if size_bytes <= MAX_READ_BYTES {
        bytes
    } else {
        Vec::new()
    };
    *slot = Some((token, kept));
    Ok(Some(PickedFileInfo {
        token,
        name,
        size_bytes,
        location,
    }))
}

/// Returns the picked file's bytes once, as a raw binary response (no JSON encoding).
#[tauri::command]
pub async fn read_picked_file(
    picked: State<'_, PickedFile>,
    token: u64,
) -> Result<Response, String> {
    let mut slot = picked
        .0
        .lock()
        .map_err(|_| "picker unavailable".to_string())?;
    match slot.take() {
        Some((stored, bytes)) if stored == token => Ok(Response::new(bytes)),
        other => {
            *slot = other;
            Err("no such picked file".into())
        }
    }
}

/// Desktop paths and Android document URIs identify a file across picks. On iOS the picker hands
/// over a temporary copy at a new path each time, so there is no stable location to report.
fn stable_location(path: &FilePath) -> Option<String> {
    if cfg!(target_os = "ios") {
        return None;
    }
    Some(match path {
        FilePath::Path(path) => path.to_string_lossy().into_owned(),
        FilePath::Url(url) => url.to_string(),
    })
}

fn file_name(path: &FilePath) -> String {
    let name = match path {
        FilePath::Path(path) => path.file_name().map(|n| n.to_string_lossy().into_owned()),
        FilePath::Url(url) => url
            .to_file_path()
            .ok()
            .and_then(|p| p.file_name().map(|n| n.to_string_lossy().into_owned()))
            .or_else(|| url.path_segments()?.next_back().map(percent_decode)),
    };
    name.filter(|n| !n.is_empty())
        .unwrap_or_else(|| FALLBACK_NAME.into())
}

fn percent_decode(segment: &str) -> String {
    let bytes = segment.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        let hex = bytes
            .get(i + 1..i + 3)
            .and_then(|h| std::str::from_utf8(h).ok());
        match (bytes[i], hex.and_then(|h| u8::from_str_radix(h, 16).ok())) {
            (b'%', Some(byte)) => {
                out.push(byte);
                i += 3;
            }
            (byte, _) => {
                out.push(byte);
                i += 1;
            }
        }
    }
    String::from_utf8_lossy(&out).into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn names_from_paths_and_urls() {
        assert_eq!(
            file_name(&FilePath::Path(PathBuf::from("/home/u/Sleep Guide.html"))),
            "Sleep Guide.html"
        );
        let url = |s: &str| FilePath::Url(s.parse().unwrap());
        assert_eq!(
            file_name(&url("file:///private/var/Inbox/sleep%20guide.html")),
            "sleep guide.html"
        );
        assert_eq!(
            file_name(&url("content://downloads/document/msf%3A12")),
            "msf:12"
        );
        assert_eq!(file_name(&url("content://downloads/")), FALLBACK_NAME);
    }

    #[test]
    fn locations_identify_the_file() {
        let path = FilePath::Path(PathBuf::from("/home/u/Downloads/guide.html"));
        assert_eq!(
            stable_location(&path).as_deref(),
            Some("/home/u/Downloads/guide.html")
        );
        let uri = FilePath::Url("content://downloads/document/msf%3A12".parse().unwrap());
        assert_eq!(
            stable_location(&uri).as_deref(),
            Some("content://downloads/document/msf%3A12")
        );
    }

    #[test]
    fn percent_decoding_tolerates_bad_input() {
        assert_eq!(percent_decode("a%20b"), "a b");
        assert_eq!(percent_decode("100%"), "100%");
        assert_eq!(percent_decode("%zz"), "%zz");
    }
}
