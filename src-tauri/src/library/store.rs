//! Book library on disk, in the app's private data folder:
//!
//! ```text
//! <app data>/library/books/<id>/meta.json     book metadata (schema owned by the TypeScript core)
//!                              /content.html  the book
//!                              /storage.json  the book's saved localStorage entries
//! ```
//!
//! Ids are validated so no input can address a path outside `books/`. Writes go to a temporary
//! file first and are then renamed, so a crash never leaves a half-written file behind.

use std::{
    collections::BTreeMap,
    fmt, fs, io,
    path::{Path, PathBuf},
};

use serde_json::Value;

const META_FILE: &str = "meta.json";
const CONTENT_FILE: &str = "content.html";
const STORAGE_FILE: &str = "storage.json";

/// Books are at most 20 MB on import; decoding (e.g. UTF-16 → UTF-8) can grow the text.
pub const MAX_CONTENT_BYTES: usize = 64 * 1024 * 1024;
const MAX_META_BYTES: usize = 64 * 1024;
/// The per-book quota is 5 MB of UTF-16; JSON escaping can expand that.
const MAX_STORAGE_BYTES: usize = 32 * 1024 * 1024;
const MAX_ID_LEN: usize = 64;

pub type StorageEntries = BTreeMap<String, String>;

#[derive(Debug)]
pub enum StoreError {
    InvalidId,
    InvalidMetadata,
    TooLarge,
    AlreadyExists,
    NotFound,
    Io(io::Error),
}

impl fmt::Display for StoreError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidId => write!(f, "invalid book id"),
            Self::InvalidMetadata => write!(f, "invalid book metadata"),
            Self::TooLarge => write!(f, "data too large"),
            Self::AlreadyExists => write!(f, "book already exists"),
            Self::NotFound => write!(f, "book not found"),
            // No paths in messages: they can contain the user's name.
            Self::Io(error) => write!(f, "storage error: {}", error.kind()),
        }
    }
}

impl From<io::Error> for StoreError {
    fn from(error: io::Error) -> Self {
        Self::Io(error)
    }
}

pub type Result<T> = std::result::Result<T, StoreError>;

pub struct LibraryStore {
    books_dir: PathBuf,
}

impl LibraryStore {
    pub fn open(root: &Path) -> Result<Self> {
        let books_dir = root.join("books");
        fs::create_dir_all(&books_dir)?;
        Ok(Self { books_dir })
    }

    /// All readable books. A damaged entry is skipped rather than failing the whole list.
    pub fn list(&self) -> Result<Vec<Value>> {
        let mut books = Vec::new();
        for entry in fs::read_dir(&self.books_dir)? {
            let entry = entry?;
            let Some(id) = entry.file_name().to_str().map(str::to_owned) else {
                continue;
            };
            if let Ok(Some(meta)) = self.get(&id) {
                books.push(meta);
            }
        }
        Ok(books)
    }

    pub fn get(&self, id: &str) -> Result<Option<Value>> {
        let Some(bytes) = read_optional(&self.book_dir(id)?.join(META_FILE))? else {
            return Ok(None);
        };
        Ok(serde_json::from_slice(&bytes).ok())
    }

    pub fn get_content(&self, id: &str) -> Result<Option<String>> {
        let path = self.book_dir(id)?.join(CONTENT_FILE);
        Ok(read_optional(&path)?.map(|bytes| String::from_utf8_lossy(&bytes).into_owned()))
    }

    pub fn add(&self, meta: &Value, content: &str) -> Result<()> {
        let id = meta_id(meta)?;
        let dir = self.book_dir(id)?;
        if dir.join(META_FILE).exists() {
            return Err(StoreError::AlreadyExists);
        }
        fs::create_dir_all(&dir)?;
        // Content first: a book "exists" once its metadata is written.
        write_limited(
            &dir.join(CONTENT_FILE),
            content.as_bytes(),
            MAX_CONTENT_BYTES,
        )?;
        write_limited(
            &dir.join(META_FILE),
            &serde_json::to_vec(meta).unwrap_or_default(),
            MAX_META_BYTES,
        )
    }

    pub fn update(&self, meta: &Value) -> Result<()> {
        let dir = self.existing_book_dir(meta_id(meta)?)?;
        write_limited(
            &dir.join(META_FILE),
            &serde_json::to_vec(meta).unwrap_or_default(),
            MAX_META_BYTES,
        )
    }

    pub fn replace(&self, meta: &Value, content: &str) -> Result<()> {
        let dir = self.existing_book_dir(meta_id(meta)?)?;
        write_limited(
            &dir.join(CONTENT_FILE),
            content.as_bytes(),
            MAX_CONTENT_BYTES,
        )?;
        write_limited(
            &dir.join(META_FILE),
            &serde_json::to_vec(meta).unwrap_or_default(),
            MAX_META_BYTES,
        )
    }

    pub fn delete(&self, id: &str) -> Result<()> {
        match fs::remove_dir_all(self.book_dir(id)?) {
            Err(error) if error.kind() != io::ErrorKind::NotFound => Err(error.into()),
            _ => Ok(()),
        }
    }

    pub fn load_storage(&self, id: &str) -> Result<StorageEntries> {
        let path = self.book_dir(id)?.join(STORAGE_FILE);
        Ok(read_optional(&path)?
            .and_then(|bytes| serde_json::from_slice(&bytes).ok())
            .unwrap_or_default())
    }

    /// Ignored for books that no longer exist (a late save after deletion must not recreate them).
    pub fn save_storage(&self, id: &str, entries: &StorageEntries) -> Result<()> {
        let dir = match self.existing_book_dir(id) {
            Err(StoreError::NotFound) => return Ok(()),
            other => other?,
        };
        let bytes = serde_json::to_vec(entries).unwrap_or_default();
        write_limited(&dir.join(STORAGE_FILE), &bytes, MAX_STORAGE_BYTES)
    }

    pub fn delete_storage(&self, id: &str) -> Result<()> {
        match fs::remove_file(self.book_dir(id)?.join(STORAGE_FILE)) {
            Err(error) if error.kind() != io::ErrorKind::NotFound => Err(error.into()),
            _ => Ok(()),
        }
    }

    fn book_dir(&self, id: &str) -> Result<PathBuf> {
        validate_id(id)?;
        Ok(self.books_dir.join(id))
    }

    fn existing_book_dir(&self, id: &str) -> Result<PathBuf> {
        let dir = self.book_dir(id)?;
        if dir.join(META_FILE).exists() {
            Ok(dir)
        } else {
            Err(StoreError::NotFound)
        }
    }
}

/// Ids are generated by the app (UUIDs). Only ASCII letters, digits and '-' are accepted,
/// which rules out separators, '..', and anything platform-specific.
fn validate_id(id: &str) -> Result<()> {
    let valid = !id.is_empty()
        && id.len() <= MAX_ID_LEN
        && id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-');
    if valid {
        Ok(())
    } else {
        Err(StoreError::InvalidId)
    }
}

fn meta_id(meta: &Value) -> Result<&str> {
    let id = meta
        .get("id")
        .and_then(Value::as_str)
        .ok_or(StoreError::InvalidMetadata)?;
    validate_id(id)?;
    Ok(id)
}

fn read_optional(path: &Path) -> Result<Option<Vec<u8>>> {
    match fs::read(path) {
        Ok(bytes) => Ok(Some(bytes)),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error.into()),
    }
}

fn write_limited(path: &Path, bytes: &[u8], max: usize) -> Result<()> {
    if bytes.len() > max {
        return Err(StoreError::TooLarge);
    }
    let temp = path.with_extension("tmp");
    fs::write(&temp, bytes)?;
    fs::rename(&temp, path)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn store() -> (tempfile::TempDir, LibraryStore) {
        let dir = tempfile::tempdir().unwrap();
        let store = LibraryStore::open(dir.path()).unwrap();
        (dir, store)
    }

    fn meta(id: &str, title: &str) -> Value {
        json!({ "id": id, "title": title, "safeMode": false })
    }

    #[test]
    fn adds_lists_and_reads_books() {
        let (_dir, store) = store();
        store.add(&meta("b-1", "One"), "<p>one</p>").unwrap();
        store.add(&meta("b-2", "Two"), "<p>two</p>").unwrap();

        let mut titles: Vec<_> = store
            .list()
            .unwrap()
            .iter()
            .map(|m| m["title"].clone())
            .collect();
        titles.sort_by_key(|t| t.to_string());
        assert_eq!(titles, vec![json!("One"), json!("Two")]);
        assert_eq!(store.get("b-1").unwrap(), Some(meta("b-1", "One")));
        assert_eq!(
            store.get_content("b-2").unwrap().as_deref(),
            Some("<p>two</p>")
        );
        assert_eq!(store.get("missing").unwrap(), None);
        assert_eq!(store.get_content("missing").unwrap(), None);
    }

    #[test]
    fn refuses_duplicate_ids_and_updates_of_missing_books() {
        let (_dir, store) = store();
        store.add(&meta("b-1", "One"), "a").unwrap();
        assert!(matches!(
            store.add(&meta("b-1", "Again"), "b"),
            Err(StoreError::AlreadyExists)
        ));
        assert_eq!(store.get_content("b-1").unwrap().as_deref(), Some("a"));
        assert!(matches!(
            store.update(&meta("b-9", "X")),
            Err(StoreError::NotFound)
        ));
        assert!(matches!(
            store.replace(&meta("b-9", "X"), "c"),
            Err(StoreError::NotFound)
        ));
    }

    #[test]
    fn update_and_replace() {
        let (_dir, store) = store();
        store.add(&meta("b-1", "One"), "v1").unwrap();
        store.update(&meta("b-1", "Renamed")).unwrap();
        assert_eq!(store.get("b-1").unwrap().unwrap()["title"], "Renamed");
        store.replace(&meta("b-1", "Second"), "v2").unwrap();
        assert_eq!(store.get_content("b-1").unwrap().as_deref(), Some("v2"));
        assert_eq!(store.get("b-1").unwrap().unwrap()["title"], "Second");
    }

    #[test]
    fn rejects_ids_that_could_escape_the_library() {
        let (_dir, store) = store();
        for id in [
            "",
            "..",
            "../x",
            "a/b",
            "a\\b",
            "C:",
            "a.b",
            "a b",
            "%2e%2e",
            &"a".repeat(65),
        ] {
            assert!(
                matches!(store.get(id), Err(StoreError::InvalidId)),
                "{id:?}"
            );
            assert!(
                matches!(store.delete(id), Err(StoreError::InvalidId)),
                "{id:?}"
            );
            assert!(
                matches!(store.add(&meta(id, "x"), "x"), Err(StoreError::InvalidId)),
                "{id:?}"
            );
        }
        assert!(matches!(
            store.add(&json!({ "title": "no id" }), "x"),
            Err(StoreError::InvalidMetadata)
        ));
        assert!(matches!(
            store.add(&json!({ "id": 5 }), "x"),
            Err(StoreError::InvalidMetadata)
        ));
    }

    #[test]
    fn enforces_size_limits() {
        let (_dir, store) = store();
        let huge = "x".repeat(MAX_CONTENT_BYTES + 1);
        assert!(matches!(
            store.add(&meta("b-1", "One"), &huge),
            Err(StoreError::TooLarge)
        ));
        assert_eq!(store.get("b-1").unwrap(), None);
    }

    #[test]
    fn storage_round_trip_and_deletion() {
        let (_dir, store) = store();
        store.add(&meta("b-1", "One"), "x").unwrap();
        assert!(store.load_storage("b-1").unwrap().is_empty());

        let entries = StorageEntries::from([("done".into(), "{\"1\":true}".into())]);
        store.save_storage("b-1", &entries).unwrap();
        assert_eq!(store.load_storage("b-1").unwrap(), entries);

        store.delete_storage("b-1").unwrap();
        store.delete_storage("b-1").unwrap();
        assert!(store.load_storage("b-1").unwrap().is_empty());
    }

    #[test]
    fn delete_removes_everything_and_late_saves_do_not_recreate_it() {
        let (_dir, store) = store();
        store.add(&meta("b-1", "One"), "x").unwrap();
        store
            .save_storage("b-1", &StorageEntries::from([("k".into(), "v".into())]))
            .unwrap();

        store.delete("b-1").unwrap();
        store.delete("b-1").unwrap();
        store
            .save_storage("b-1", &StorageEntries::from([("k".into(), "v".into())]))
            .unwrap();

        assert!(store.list().unwrap().is_empty());
        assert!(store.load_storage("b-1").unwrap().is_empty());
    }

    #[test]
    fn skips_damaged_entries_when_listing() {
        let (dir, store) = store();
        store.add(&meta("b-1", "One"), "x").unwrap();
        fs::create_dir_all(dir.path().join("books/b-2")).unwrap();
        fs::write(dir.path().join("books/b-2/meta.json"), "not json").unwrap();
        fs::create_dir_all(dir.path().join("books/not valid")).unwrap();

        assert_eq!(store.list().unwrap().len(), 1);
    }
}
