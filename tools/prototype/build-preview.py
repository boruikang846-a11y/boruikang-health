"""Package the click-through prototype into one offline HTML file."""

import argparse
import base64
import gzip
import json
import re
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("output", type=Path, help="Destination for the standalone HTML")
parser.add_argument("--browser-url", type=Path, help="Optional compressed data URL for opening in a browser")
parser.add_argument("--patient-import", action="store_true", help="Open directly in the patient center as the fictional manager")
parser.add_argument("--screening-center", action="store_true", help="Open screening center as the fictional manager")
parser.add_argument("--intervention-center", action="store_true", help="Open the five service centers")
args = parser.parse_args()
web = Path(__file__).resolve().parents[2] / "docs/demo-static/web/admin"
html = (web / "index.html").read_text(encoding="utf-8")

def asset_text(filename):
    path = (web / filename).resolve()
    if not path.is_relative_to(web.resolve()):
        raise ValueError("Asset must stay inside the prototype: " + filename)
    return path.read_text(encoding="utf-8")


# Use the entry page's asset order so new centers are included automatically.
html = re.sub(
    r'<link rel="stylesheet" href="([^"]+)">',
    lambda match: "<style>" + asset_text(match[1]) + "</style>",
    html,
)
html = re.sub(
    r'<script src="([^"]+)"></script>',
    lambda match: "<script>" + asset_text(match[1]).replace("</script", "<\\/script") + "</script>",
    html,
)
if args.patient_import:
    html = re.sub(r"<body[^>]*>", '<body data-demo-entry="patient-import">', html, count=1)
if args.screening_center:
    html = re.sub(r"<body[^>]*>", '<body data-demo-entry="screening-center">', html, count=1)
if args.intervention_center:
    html = re.sub(r"<body[^>]*>", '<body data-demo-entry="intervention-center">', html, count=1)
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(html, encoding="utf-8")
result = {"html": str(args.output.resolve()), "html_bytes": args.output.stat().st_size}
if args.browser_url:
    payload = base64.b64encode(gzip.compress(html.encode("utf-8"), mtime=0)).decode("ascii")
    loader = '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>Health 原型</title><body><p id="loading">正在打开完整交互原型…</p><script>(async()=>{const bytes=Uint8Array.from(atob(' + json.dumps(payload) + '),c=>c.charCodeAt(0));const html=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).text();document.open();document.write(html);document.close()})().catch(()=>{document.getElementById("loading").textContent="浏览器未支持压缩预览，请打开提供的离线 HTML 文件。"})</script></body></html>'
    url = "data:text/html;charset=utf-8;base64," + base64.b64encode(loader.encode("utf-8")).decode("ascii")
    args.browser_url.parent.mkdir(parents=True, exist_ok=True)
    args.browser_url.write_text(url, encoding="utf-8")
    result.update(browser_url_file=str(args.browser_url), browser_url_bytes=len(url))
print(json.dumps(result, ensure_ascii=False))
