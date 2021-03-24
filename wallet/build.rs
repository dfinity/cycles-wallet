use std::env;
use std::fs::File;
use std::io::Write;
use std::path::{Path, PathBuf};

fn main() {
    let out_dir = env::var("OUT_DIR").unwrap();
    let pwd = env::var("CARGO_MANIFEST_DIR").unwrap();

    let getting_out_dir: PathBuf = PathBuf::from(out_dir.clone())
        .strip_prefix(pwd)
        .unwrap()
        .components()
        .map(|_| "..")
        .collect();
    let loader_path = Path::new(&out_dir).join("http_request.rs");
    let mut f = File::create(&loader_path).unwrap();

    f.write_all(
        b"
        #[derive(CandidType, Deserialize, Debug)]
        pub struct HeaderField(pub String, pub String);

        #[derive(CandidType, Deserialize, Debug)]
        pub struct HttpRequest {
            pub method: String,
            pub url: String,
            pub headers: Vec<HeaderField>,
            pub body: Vec<u8>,
        }

        #[derive(CandidType, Deserialize, Debug)]
        pub struct HttpResponse {
            pub status_code: u16,
            pub headers: Vec<HeaderField>,
            pub body: Vec<u8>,
        }

        fn file_name_bytes(path: &str) -> Option<&'static [u8]> {
    ",
    )
    .unwrap();

    for entry in std::fs::read_dir("../dist").unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();
        let filename = path.file_name().unwrap().to_str().unwrap();

        if !filename.ends_with(".js.gz") && !filename.ends_with(".html.gz") {
            continue;
        }

        let url_path = path.file_name().unwrap().to_str().unwrap();
        let url_path = &url_path[..url_path.len() - 3];

        f.write_fmt(format_args!(
            r#"
            if path == "/{0}" || path == "{0}" {{
                return Some(include_bytes!("{1}/{2}"));
            }}
            "#,
            url_path,
            getting_out_dir.to_str().unwrap(),
            path.to_str().unwrap(),
        ))
        .unwrap();
    }

    f.write_all(
        r#"None
        }

        #[query]
        fn http_request(request: HttpRequest) -> HttpResponse {
            if let Some(bytes) = file_name_bytes(request.url.as_str()).or_else(|| file_name_bytes("/index.html")) {
                HttpResponse {
                  status_code: 200,
                  headers: vec![
                    HeaderField("Content-Encoding".to_string(), "gzip".to_string()),
                    HeaderField("Content-Length".to_string(), format!("{}", bytes.len())),
                    HeaderField("Cache-Control".to_string(), format!("max-age={}", 600)),
                  ],
                  body: bytes.to_vec(),
                }
            } else {
                HttpResponse {
                  status_code: 404,
                  headers: vec![],
                  body: vec![],
                }
            }
        }
    "#
        .as_bytes(),
    )
    .unwrap();
}
