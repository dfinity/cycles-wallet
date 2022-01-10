use sha2::Digest;
use std::env;
use std::ffi::OsStr;
use std::fs;
use std::fs::File;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;

fn hash_file(path: &Path) -> [u8; 32] {
    let bytes = fs::read(path)
        .unwrap_or_else(|e| panic!("failed to read file {}: {}", &path.to_str().unwrap(), e));
    let mut hasher = sha2::Sha256::new();
    hasher.update(&bytes);
    hasher.finalize().into()
}

fn main() {
    let out_dir = env::var("OUT_DIR").unwrap();
    let location = Command::new(env::var("CARGO").unwrap())
        .args(&["locate-project", "--workspace", "--message-format=plain"])
        .output()
        .expect("Could not locate project");
    assert!(location.status.success(), "Could not locate project");
    let pwd = String::from_utf8(location.stdout).expect("Could not locate project");
    let pwd = Path::new(pwd.trim()).parent().unwrap();
    let getting_out_dir: PathBuf = PathBuf::from(out_dir.clone())
        .strip_prefix(pwd)
        .unwrap()
        .components()
        .map(|_| "..")
        .collect();
    println!(
        "cargo:rustc-env=DIST_DIR={}/dist/",
        getting_out_dir.to_str().unwrap()
    );
    let loader_path = Path::new(&out_dir).join("assets.rs");
    eprintln!("cargo:rerun-if-changed={}", loader_path.to_string_lossy());
    let mut f = File::create(&loader_path).unwrap();

    writeln!(
        f,
        r#"
pub fn for_each_asset(mut f: impl FnMut(&'static str, Vec<(String, String)>, &'static [u8], &[u8; 32])) {{
"#
    )
    .unwrap();

    for entry in std::fs::read_dir(pwd.join("dist")).unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();
        let filename = path.file_name().unwrap().to_str().unwrap();

        let (file_type, gzipped) = if filename.ends_with(".js") {
            ("text/javascript; charset=UTF-8", false)
        } else if filename.ends_with(".js.gz") {
            ("text/javascript; charset=UTF-8", true)
        } else if filename.ends_with(".html") {
            ("text/html; charset=UTF-8", false)
        } else if filename.ends_with(".html.gz") {
            ("text/html; charset=UTF-8", true)
        } else if filename.ends_with(".png") {
            ("image/png", false)
        } else if filename.ends_with(".ico") {
            ("image/x-icon", false)
        } else if filename.ends_with(".svg") {
            ("image/svg+xml", false)
        } else if filename.ends_with(".txt") {
            // Ignore these.
            eprintln!("File ignored: {}", filename);
            continue;
        } else {
            unreachable!(
                "Filename extension needs to be added to resolve content type: {}",
                filename
            );
        };

        let url_path = path.file_name().unwrap();
        let path_buf = PathBuf::from(url_path);
        let ext = path_buf.extension();
        let ext_len = if ext == Some(OsStr::new("gz")) { 3 } else { 0 };
        let url_path = url_path.to_str().unwrap();
        let url_path = &url_path[..url_path.len() - ext_len];
        let url_path = "/".to_string() + url_path;

        let hash = hash_file(&path);
        writeln!(
            f,
            r#"  f("{}", vec![("Content-Type".to_string(), "{}".to_string()){},("Cache-Control".to_string(), "max-age=600".to_string())], &include_bytes!(concat!(env!("DIST_DIR"), "{}"))[..], &{:?});"#,
            url_path,
            file_type,
            if gzipped { r#",("Content-Encoding".to_string(), "gzip".to_string())"# } else { "" },
            filename,
            hash
        )
        .unwrap();
        println!("cargo:rerun-if-changed={}", path.to_str().unwrap());
    }
    writeln!(f, "}}").unwrap();
    println!("cargo:rerun-if-changed=build.rs");
}
