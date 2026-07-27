"""
S&O+ Browser Module — all browser functions in one file.
- Playwright-powered rendering with ad blocking
- Proxy fallback for blocked sites
- Reusable page/context for speed
- Bookmarks, history, reader mode
"""
import re as _re
import ssl
import json
import urllib.parse as _urlparse
import urllib.request as _urllib_request

from flask import Blueprint, request, jsonify, render_template

browser_bp = Blueprint('browser', __name__)

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

# ═══════════════════════════════════════════════════════════
#  AD / TRACKER DOMAINS
# ═══════════════════════════════════════════════════════════
AD_DOMAINS = {
    'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
    'adnxs.com', 'adsrvr.org', 'facebook.net', 'google-analytics.com',
    'googletagmanager.com', 'ads.google.com', 'pagead2.googlesyndication.com',
    'tpc.googlesyndication.com'
}

BLOCKED_DOMAINS = [
    'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
    'adnxs.com', 'adsrvr.org', 'facebook.net', 'analytics.google.com',
    'googletagmanager.com'
]

TEXT_SITES = {
    'wikipedia.org', 'britannica.com', 'mdn.io', 'developer.mozilla.org',
    'stackoverflow.com', 'github.com', 'docs.python.org', 'docs.microsoft.com',
    'medium.com', 'substack.com', 'arxiv.org', 'khanacademy.org', 'wolframalpha.com',
    'dictionary.com', 'merriam-webster.com', 'geeksforgeeks.org', 'w3schools.com',
    'tutorialspoint.com', 'reddit.com', 'quora.com'
}

# ═══════════════════════════════════════════════════════════
#  PLAYWRIGHT — lazy singleton
# ═══════════════════════════════════════════════════════════
_pw_browser = None
_pw_instance = None
_pw_page = None


def _get_pw_browser():
    global _pw_browser, _pw_instance
    if _pw_browser is None or not _pw_browser.is_connected():
        from playwright.sync_api import sync_playwright
        _pw_instance = sync_playwright().start()
        _pw_browser = _pw_instance.chromium.launch(
            headless=True,
            args=[
                '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
                '--disable-background-networking', '--disable-default-apps',
                '--disable-sync', '--disable-translate', '--metrics-recording-only',
                '--no-first-run', '--disable-blink-features=AutomationControlled',
                '--disk-cache-size=52428800', '--media-cache-size=52428800',
            ]
        )
    return _pw_browser


def _get_pw_page():
    global _pw_page, _pw_browser
    browser = _get_pw_browser()
    if _pw_page is None or _pw_page.is_closed():
        ctx = browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                       '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            viewport={'width': 1280, 'height': 800},
            java_script_enabled=True
        )

        def _route_handler(route):
            req_host = _urlparse.urlparse(route.request.url).hostname or ''
            if any(d in req_host for d in AD_DOMAINS):
                return route.abort()
            return route.continue_()

        ctx.route('**/*', _route_handler)
        _pw_page = ctx.new_page()
    return _pw_page


def _reset_pw_page():
    global _pw_page
    try:
        if _pw_page and not _pw_page.is_closed():
            _pw_page.close()
    except Exception:
        pass
    _pw_page = None


# ═══════════════════════════════════════════════════════════
#  PAGE FETCH — lite (urllib) and full (playwright)
# ═══════════════════════════════════════════════════════════
def _browse_lite(url):
    try:
        req = _urllib_request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8'
        })
        with _urllib_request.urlopen(req, context=SSL_CTX, timeout=12) as resp:
            ct = resp.headers.get('Content-Type', '')
            if 'text/html' not in ct:
                return jsonify({'error': 'Não é HTML', 'url': url}), 400
            raw = resp.read(2_000_000).decode('utf-8', errors='replace')
            final_url = resp.url

        raw = _re.sub(r'<script[^>]*>.*?</script>', '', raw, flags=_re.IGNORECASE | _re.DOTALL)
        raw = _re.sub(r'<!--.*?-->', '', raw, flags=_re.DOTALL)
        raw = _re.sub(r'<(iframe|video|audio|object|embed|noscript)[^>]*>.*?</\1>', '', raw,
                       flags=_re.IGNORECASE | _re.DOTALL)
        base_parsed = _urlparse.urlparse(final_url)
        base_origin = f"{base_parsed.scheme}://{base_parsed.netloc}"
        raw = _re.sub(r'<base\s+[^>]*>', '', raw, flags=_re.IGNORECASE)
        raw = (f'<base href="{base_origin}/">'
               f'<style>body{{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;'
               f'padding:20px;line-height:1.7;color:#1a1a1a;background:#fff;img{{max-width:100%}}}}</style>'
               + raw)
        title = _extract_title(raw)
        return jsonify({'html': raw, 'title': title, 'url': final_url, 'mode': 'lite'})
    except Exception as e:
        return jsonify({'error': str(e)[:200], 'url': url}), 502


def _browse_full(url):
    try:
        page = _get_pw_page()
        try:
            page.goto(url, wait_until='commit', timeout=20000)
            try:
                page.wait_for_load_state('domcontentloaded', timeout=10000)
            except Exception:
                pass
            try:
                page.wait_for_load_state('networkidle', timeout=8000)
            except Exception:
                pass

            page.evaluate("""() => {
                document.querySelectorAll('[class*="ad-"],[class*="ads-"],[id*="ad-"],[id*="ads-"],[class*="advert"],[data-ad]').forEach(e => e.remove());
                document.querySelectorAll('[class*="cookie"],[class*="consent"],[id*="cookie"],[id*="consent"],[class*="gdpr"]').forEach(e => e.remove());
                document.querySelectorAll('[style*="position: fixed"],[style*="position:fixed"]').forEach(e => {
                    const tag = e.tagName;
                    if (tag !== 'NAV' && tag !== 'HEADER' && !e.querySelector('video,iframe')) e.remove();
                });
                document.querySelectorAll('[class*="share-popup"],[class*="social-modal"],[class*="newsletter-popup"]').forEach(e => e.remove());
            }""")

            html = page.content()
            final_url = page.url
            base_parsed = _urlparse.urlparse(final_url)
            base_origin = f"{base_parsed.scheme}://{base_parsed.netloc}"
            html = _re.sub(r'<base\s+[^>]*>', '', html, flags=_re.IGNORECASE)
            html = f'<base href="{base_origin}/">' + html
            title = page.title() or _extract_title(html)
            return jsonify({'html': html, 'title': title, 'url': final_url, 'mode': 'playwright'})
        except Exception as page_err:
            _reset_pw_page()
            raise page_err
    except Exception as e:
        print(f"[Playwright falhou para {url}: {e}] — fallback lite")
        return _browse_lite(url)


def _extract_title(html):
    m = _re.search(r'<title[^>]*>(.*?)</title>', html, _re.IGNORECASE | _re.DOTALL)
    return m.group(1).strip() if m else 'Sem título'


# ═══════════════════════════════════════════════════════════
#  PROXY — server-side fetch for blocked sites
# ═══════════════════════════════════════════════════════════
def proxy_fetch(url):
    import requests
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                          '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        }
        r = requests.get(url, headers=headers, timeout=20, allow_redirects=True, verify=False)
        ct = r.headers.get('Content-Type', 'text/html')
        if 'text/html' not in ct:
            return jsonify({'error': 'Not HTML'}), 400
        html = r.text
        base = r.url
        base_parsed = _urlparse.urlparse(base)
        base_origin = f"{base_parsed.scheme}://{base_parsed.netloc}"
        html = _re.sub(r'<base\s+[^>]*>', '', html, flags=_re.IGNORECASE)
        html = _re.sub(r'<head>', f'<head><base href="{base_origin}/">', html, count=1,
                        flags=_re.IGNORECASE)
        html = _re.sub(r'<script[^>]*>.*?</script>', '', html, flags=_re.IGNORECASE | _re.DOTALL)
        html = _re.sub(r'xmlns="[^"]*"', '', html)
        html = _re.sub(r'x-frame-options[^"]*"[^"]*"', '', html, flags=_re.IGNORECASE)
        html = _re.sub(r'content-security-policy[^"]*"[^"]*"', '', html, flags=_re.IGNORECASE)
        for pattern in BLOCKED_DOMAINS:
            pat = (r'<[^>]*(?:src|href|action)=["\x27][^"\x27]*?' + _re.escape(pattern)
                   + r'[^"\x27]*["\x27][^>]*>')
            html = _re.sub(pat, '', html, flags=_re.IGNORECASE)
        html = html.replace("window.open", "void(0)")
        html = html.replace("window.location.href", "void(0)")
        html = html.replace("window.location.replace", "void(0)")
        return html, 200, {'Content-Type': 'text/html; charset=utf-8', 'X-Proxy': 'soplus',
                            'Access-Control-Allow-Origin': '*'}
    except Exception as e:
        return jsonify({'error': str(e)[:120]}), 502


# ═══════════════════════════════════════════════════════════
#  IN-MEMORY STORE — bookmarks & history
# ═══════════════════════════════════════════════════════════
_browser_bookmarks = []
_browser_history = []


# ═══════════════════════════════════════════════════════════
#  FLASK ROUTES (registered as Blueprint)
# ═══════════════════════════════════════════════════════════

@browser_bp.route('/browser')
def browser_page():
    return render_template('browser.html')


@browser_bp.route('/api/browse', methods=['GET'])
def browse_page():
    url = request.args.get('url', '').strip()
    mode = request.args.get('mode', 'auto').strip()
    if not url:
        return jsonify({'error': 'No URL'}), 400
    if not url.startswith(('http://', 'https://')):
        return jsonify({'error': 'Invalid URL'}), 400
    parsed = _urlparse.urlparse(url)
    if parsed.hostname in ('localhost', '127.0.0.1', '0.0.0.0'):
        return jsonify({'error': 'Blocked'}), 403

    hostname = (parsed.hostname or '').replace('www.', '')

    if mode == 'lite':
        return _browse_lite(url)

    if mode == 'auto' and any(hostname.endswith(s) for s in TEXT_SITES):
        return _browse_lite(url)

    return _browse_full(url)


@browser_bp.route('/api/proxy', methods=['GET'])
def proxy_route():
    url = request.args.get('url', '').strip()
    if not url:
        return jsonify({'error': 'No URL'}), 400
    if not url.startswith(('http://', 'https://')):
        return jsonify({'error': 'Invalid URL'}), 400
    parsed = _urlparse.urlparse(url)
    if parsed.hostname in ('localhost', '127.0.0.1', '0.0.0.0'):
        return jsonify({'error': 'Blocked'}), 403
    return proxy_fetch(url)


@browser_bp.route('/api/browser/bookmarks', methods=['GET'])
def browser_get_bookmarks():
    return jsonify(_browser_bookmarks)


@browser_bp.route('/api/browser/bookmarks', methods=['POST'])
def browser_add_bookmark():
    d = request.json or {}
    url, name = d.get('url', ''), d.get('name', '')
    if url and not any(b['url'] == url for b in _browser_bookmarks):
        _browser_bookmarks.append({'url': url, 'name': name or url})
    return jsonify({'ok': True})


@browser_bp.route('/api/browser/bookmarks', methods=['DELETE'])
def browser_del_bookmark():
    d = request.json or {}
    url = d.get('url', '')
    global _browser_bookmarks
    _browser_bookmarks = [b for b in _browser_bookmarks if b['url'] != url]
    return jsonify({'ok': True})


@browser_bp.route('/api/browser/history', methods=['GET'])
def browser_get_history():
    return jsonify(_browser_history[:30])


@browser_bp.route('/api/browser/history', methods=['POST'])
def browser_add_history():
    d = request.json or {}
    url, title = d.get('url', ''), d.get('title', '')
    _browser_history.insert(0, {'url': url, 'title': title or url})
    del _browser_history[31:]
    return jsonify({'ok': True})
