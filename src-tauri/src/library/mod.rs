//! Tauri commands for the book library. They are the only native operations the app UI can
//! call (see build.rs / capabilities). None of them accepts a file path.

pub mod store;

use std::sync::Mutex;

use serde_json::Value;
use tauri::State;

use store::{LibraryStore, StorageEntries};

pub struct Library(pub Mutex<LibraryStore>);

type CommandResult<T> = Result<T, String>;

fn with_store<T>(
    library: &State<'_, Library>,
    work: impl FnOnce(&LibraryStore) -> store::Result<T>,
) -> CommandResult<T> {
    let store = library
        .0
        .lock()
        .map_err(|_| "library unavailable".to_string())?;
    work(&store).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn library_list(library: State<'_, Library>) -> CommandResult<Vec<Value>> {
    with_store(&library, LibraryStore::list)
}

#[tauri::command]
pub async fn library_get(library: State<'_, Library>, id: String) -> CommandResult<Option<Value>> {
    with_store(&library, |store| store.get(&id))
}

#[tauri::command]
pub async fn library_get_content(
    library: State<'_, Library>,
    id: String,
) -> CommandResult<Option<String>> {
    with_store(&library, |store| store.get_content(&id))
}

#[tauri::command]
pub async fn library_add(
    library: State<'_, Library>,
    book: Value,
    content: String,
) -> CommandResult<()> {
    with_store(&library, |store| store.add(&book, &content))
}

#[tauri::command]
pub async fn library_update(library: State<'_, Library>, book: Value) -> CommandResult<()> {
    with_store(&library, |store| store.update(&book))
}

#[tauri::command]
pub async fn library_replace(
    library: State<'_, Library>,
    book: Value,
    content: String,
) -> CommandResult<()> {
    with_store(&library, |store| store.replace(&book, &content))
}

#[tauri::command]
pub async fn library_delete(library: State<'_, Library>, id: String) -> CommandResult<()> {
    with_store(&library, |store| store.delete(&id))
}

#[tauri::command]
pub async fn book_storage_load(
    library: State<'_, Library>,
    id: String,
) -> CommandResult<StorageEntries> {
    with_store(&library, |store| store.load_storage(&id))
}

#[tauri::command]
pub async fn book_storage_save(
    library: State<'_, Library>,
    id: String,
    entries: StorageEntries,
) -> CommandResult<()> {
    with_store(&library, |store| store.save_storage(&id, &entries))
}

#[tauri::command]
pub async fn book_storage_delete(library: State<'_, Library>, id: String) -> CommandResult<()> {
    with_store(&library, |store| store.delete_storage(&id))
}
