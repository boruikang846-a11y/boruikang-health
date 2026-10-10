"""Package the click-through prototype into one offline HTML file."""

import argparse
import base64
import gzip
import json
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("output", type=Path, help="Destination for the standalone HTML")
parser.add_argument("--browser-url", type=Path, help="Optional compressed data URL for opening in a browser")
parser.add_argument("--patient-import", action="store_true", help="Open directly in the patient center as the fictional manager")
parser.add_argument("--screening-center", action="store_true", help="Open screening center as the fictional manager")
args = parser.parse_args()
web = Path(__file__).resolve().parent / "web"
html = (web / "interactive.html").read_text(encoding="utf-8")
css = (web / "interactive.css").read_text(encoding="utf-8")
scripts = ["implementation-contract.js", "patient-import-files.js", "patient-import.js", "quality-wecom.js", "platform-prototype.js", "screening-sheet-data.js", "screening-sheet.js", "screening-cycle.js", "screening-import.js", "care-cycle.js", "journey.js", "interactive.js", "after-care-service.js"]
html = html.replace('<link rel="stylesheet" href="interactive.css">', "<style>" + css + "</style>")
html = html.replace('<link rel="stylesheet" href="after-care-service.css">', "<style>" + (web / "after-care-service.css").read_text(encoding="utf-8") + "</style>")
html = html.replace('<link rel="stylesheet" href="service-navigation.css">', "<style>" + (web / "service-navigation.css").read_text(encoding="utf-8") + "</style>")
scripts.extend(["service-navigation.js", "screening-center.js"])
html = html.replace('<link rel="stylesheet" href="screening-center.css">', "<style>" + (web / "screening-center.css").read_text(encoding="utf-8") + "</style>")
for filename in scripts:
    js = (web / filename).read_text(encoding="utf-8")
    html = html.replace('<script src="' + filename + '"></script>', "<script>" + js.replace("</script", "<\\/script") + "</script>")
if args.patient_import:
    html = html.replace("<body>", '<body data-demo-entry="patient-import">')
if args.screening_center:
    html = html.replace("<body>", '<body data-demo-entry="screening-center">')
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
