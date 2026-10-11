"""Rebuild offline HTML entries and optional screenshots from fictional data."""
import argparse
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--render-screenshots', action='store_true',
                        help='Render fictional HTML previews using installed Playwright/Chromium')
    args = parser.parse_args()
    catalog = json.loads((ROOT / 'assets/catalog.json').read_text(encoding='utf-8'))
    assert len({entry['key'] for entry in catalog}) == len(catalog), 'Duplicate page keys'
    for entry in catalog:
        dest = ROOT / entry['html']
        dest.parent.mkdir(parents=True, exist_ok=True)
        prefix = '../' * (len(Path(entry['html']).parts) - 1)
        dest.write_text(f'''<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(entry['title'])} · AECG HTML 预览</title><link rel="stylesheet" href="{prefix}assets/preview.css"></head>
<body data-page="{html.escape(entry['key'])}" data-root="{prefix}"><div id="app"></div>
<script src="{prefix}assets/catalog.js"></script><script src="{prefix}assets/preview.js"></script></body></html>
''', encoding='utf-8')
    (ROOT / 'assets/catalog.js').write_text(
        'window.AECG_CATALOG = ' + json.dumps(catalog, ensure_ascii=False, indent=2) + ';\n',
        encoding='utf-8')
    if args.render_screenshots:
        from playwright.sync_api import sync_playwright
        errors = []
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            page = browser.new_page(viewport={'width': 1280, 'height': 656}, device_scale_factor=1)
            page.set_default_timeout(5000)
            page.route('http://**/*', lambda route: route.abort())
            page.route('https://**/*', lambda route: route.abort())
            page.on('pageerror', lambda error: errors.append(str(error)))
            for entry in catalog:
                page.goto((ROOT / entry['html']).as_uri())
                page.wait_for_selector('.main-view')
                assert not errors, (entry['key'], errors)
                target = ROOT / entry['image']
                target.parent.mkdir(parents=True, exist_ok=True)
                page.screenshot(path=str(target), animations='disabled')
            browser.close()
    print(f'Generated {len(catalog)} HTML entries' +
          (' and fictional preview screenshots' if args.render_screenshots else ''))


if __name__ == '__main__':
    main()
