//! Serves the book frame page on its own origin (`bookframe://localhost/frame.html`, or
//! `http://bookframe.localhost/frame.html` on Windows and Android). See docs/SECURITY.md.

use tauri::http::{header, Method, Request, Response, StatusCode};

pub const SCHEME: &str = "bookframe";
const PAGE_PATH: &str = "/frame.html";
const PAGE: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/frame.html"));
/// Used if the page has no readable policy: allow nothing.
const FALLBACK_CSP: &str = "default-src 'none'";

pub fn respond(request: &Request<Vec<u8>>) -> Response<Vec<u8>> {
    if request.method() != Method::GET || request.uri().path() != PAGE_PATH {
        return Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(Vec::new())
            .expect("static response is valid");
    }
    Response::builder()
        .header(header::CONTENT_TYPE, "text/html; charset=utf-8")
        .header("Content-Security-Policy", response_csp(PAGE))
        .header(header::X_CONTENT_TYPE_OPTIONS, "nosniff")
        .header(header::CACHE_CONTROL, "no-store")
        .header(header::REFERRER_POLICY, "no-referrer")
        .body(PAGE.to_vec())
        .expect("static response is valid")
}

/// The page's own CSP (single source of truth: `src/core/reader/frame-policy.ts`), repeated as
/// a header plus `sandbox allow-scripts`, which only a header can carry. The sandbox keeps the
/// page sandboxed even if it is ever loaded outside the reader's iframe.
fn response_csp(page: &[u8]) -> String {
    let policy = meta_csp(&String::from_utf8_lossy(page)).unwrap_or_else(|| FALLBACK_CSP.into());
    format!("{policy}; sandbox allow-scripts")
}

fn meta_csp(html: &str) -> Option<String> {
    let start = html.find("http-equiv=\"Content-Security-Policy\"")?;
    let rest = &html[start..];
    let content = rest.find("content=\"")? + "content=\"".len();
    let end = rest[content..].find('"')?;
    Some(
        rest[content..content + end]
            .replace("&quot;", "\"")
            .replace("&amp;", "&"),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    fn get(path: &str) -> Response<Vec<u8>> {
        respond(
            &Request::get(format!("bookframe://localhost{path}"))
                .body(Vec::new())
                .unwrap(),
        )
    }

    #[test]
    fn serves_only_the_frame_page() {
        assert_eq!(get("/frame.html").status(), StatusCode::OK);
        assert_eq!(get("/").status(), StatusCode::NOT_FOUND);
        assert_eq!(get("/../index.html").status(), StatusCode::NOT_FOUND);
        assert_eq!(get("/other.html").status(), StatusCode::NOT_FOUND);
        let post = Request::post("bookframe://localhost/frame.html")
            .body(Vec::new())
            .unwrap();
        assert_eq!(respond(&post).status(), StatusCode::NOT_FOUND);
    }

    #[test]
    fn repeats_the_page_policy_as_a_header_with_sandbox() {
        let page = br#"<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'">"#;
        assert_eq!(
            response_csp(page),
            "default-src 'none'; script-src 'unsafe-inline'; sandbox allow-scripts"
        );
    }

    #[test]
    fn falls_back_to_allowing_nothing() {
        assert_eq!(
            response_csp(b"<p>no policy</p>"),
            "default-src 'none'; sandbox allow-scripts"
        );
    }

    #[test]
    fn page_is_sent_with_hardening_headers() {
        let response = get("/frame.html");
        let csp = response.headers()["Content-Security-Policy"]
            .to_str()
            .unwrap();
        assert!(csp.ends_with("sandbox allow-scripts"));
        assert_eq!(
            response.headers()[header::X_CONTENT_TYPE_OPTIONS],
            "nosniff"
        );
    }
}
