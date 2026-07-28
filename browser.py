"""
S&O+ Browser Module v3.2 — embedded + optional native pywebview window.
"""
import re as _re
import ssl
import json
import urllib.parse as _urlparse
import urllib.request as _urllib_request
import multiprocessing as _mp
from flask import Blueprint, request, jsonify, render_template

browser_bp = Blueprint('browser', __name__)

SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE

# ═══════════════════════════════════════════════════════════
#  PYWEBVIEW — optional secondary native window
# ═══════════════════════════════════════════════════════════
_pw_process = None
_pw_url = None


def _pw_worker(url):
    try:
        import webview
        win = webview.create_window(
            'S&O+ Browser Nativo', url,
            width=1280, height=800,
            min_size=(640, 400),
            text_select=True,
            zoomable=True,
        )
        webview.start(debug=False)
    except Exception as e:
        print(f"[pywebview fatal: {e}]")


def _open_pywebview(url):
    global _pw_process, _pw_url
    if _pw_process and _pw_process.is_alive():
        try:
            _pw_process.terminate()
            _pw_process.join(timeout=2)
        except Exception:
            pass
    _pw_url = url
    _pw_process = _mp.Process(target=_pw_worker, args=(url,), daemon=True)
    _pw_process.start()
    return True


def _pw_alive():
    return _pw_process is not None and _pw_process.is_alive()

# ═══════════════════════════════════════════════════════════
#  DOMAINS
# ═══════════════════════════════════════════════════════════
AD_DOMAINS = {
    'doubleclick.net', 'googlesyndication.com', 'googleadservices.com',
    'adnxs.com', 'adsrvr.org', 'facebook.net', 'google-analytics.com',
    'googletagmanager.com', 'ads.google.com', 'pagead2.googlesyndication.com',
}

TEXT_SITES = {
    'wikipedia.org', 'britannica.com', 'mdn.io', 'developer.mozilla.org',
    'stackoverflow.com', 'github.com', 'docs.python.org', 'docs.microsoft.com',
    'medium.com', 'substack.com', 'arxiv.org', 'khanacademy.org',
    'dictionary.com', 'geeksforgeeks.org', 'w3schools.com', 'reddit.com',
}

# ═══════════════════════════════════════════════════════════
#  IN-MEMORY STORE
# ═══════════════════════════════════════════════════════════
_browser_bookmarks = []
_browser_history = []


def _add_history(url, title):
    _browser_history.insert(0, {'url': url, 'title': title or url})
    del _browser_history[51:]


# ═══════════════════════════════════════════════════════════
#  LITE FETCH — urllib (fast, no browser)
# ═══════════════════════════════════════════════════════════
def _browse_lite(url):
    try:
        req = _urllib_request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                          '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
        })
        with _urllib_request.urlopen(req, context=SSL_CTX, timeout=15) as resp:
            ct = resp.headers.get('Content-Type', '')
            if 'text/html' not in ct:
                return jsonify({'error': 'Não é HTML'}), 400
            raw = resp.read(2_000_000).decode('utf-8', errors='replace')
            final_url = resp.url

        # Strip scripts/ads/heavy elements
        raw = _re.sub(r'<script[^>]*>.*?</script>', '', raw, flags=_re.IGNORECASE | _re.DOTALL)
        raw = _re.sub(r'<!--.*?-->', '', raw, flags=_re.DOTALL)
        raw = _re.sub(r'<(iframe|video|audio|object|embed|noscript)[^>]*>.*?</\1>', '',
                      raw, flags=_re.IGNORECASE | _re.DOTALL)
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


# ═══════════════════════════════════════════════════════════
#  PROXY FETCH — requests (fallback)
# ═══════════════════════════════════════════════════════════
def proxy_fetch(url):
    import requests
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                          '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
            'Upgrade-Insecure-Requests': '1',
        }
        r = requests.get(url, headers=headers, timeout=20, allow_redirects=True, verify=False)
        if 'text/html' not in r.headers.get('Content-Type', ''):
            return jsonify({'error': 'Not HTML'}), 400
        html = r.text
        base_parsed = _urlparse.urlparse(r.url)
        base_origin = f"{base_parsed.scheme}://{base_parsed.netloc}"
        html = _re.sub(r'<base\s+[^>]*>', '', html, flags=_re.IGNORECASE)
        html = _re.sub(r'<head>', f'<head><base href="{base_origin}/">', html, count=1,
                        flags=_re.IGNORECASE)
        html = _re.sub(r'<script[^>]*>.*?</script>', '', html, flags=_re.IGNORECASE | _re.DOTALL)
        html = _re.sub(r'xmlns="[^"]*"', '', html)
        return html, 200, {'Content-Type': 'text/html; charset=utf-8',
                            'X-Proxy': 'soplus', 'Access-Control-Allow-Origin': '*'}
    except Exception as e:
        return jsonify({'error': str(e)[:120]}), 502


def _extract_title(html):
    m = _re.search(r'<title[^>]*>(.*?)</title>', html, _re.IGNORECASE | _re.DOTALL)
    return m.group(1).strip() if m else 'Sem título'


# ═══════════════════════════════════════════════════════════
#  FLASK ROUTES
# ═══════════════════════════════════════════════════════════

@browser_bp.route('/browser')
def browser_page():
    return render_template('browser.html')


# ─── native pywebview: open/navigate ───
@browser_bp.route('/api/browser/open-native', methods=['POST'])
def browser_open_native():
    """Open URL in a separate native pywebview window."""
    data = request.json or {}
    url = data.get('url', '')
    if not url:
        return jsonify({'error': 'Sem URL'}), 400
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    try:
        _open_pywebview(url)
        title = data.get('title', '')
        if url and title:
            _add_history(url, title)
        return jsonify({'ok': True, 'mode': 'native', 'url': url})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)[:200]}), 500


@browser_bp.route('/api/browser/native-status', methods=['GET'])
def browser_native_status():
    return jsonify({'alive': _pw_alive(), 'url': _pw_url})


@browser_bp.route('/api/browser/close-native', methods=['POST'])
def browser_close_native():
    global _pw_process, _pw_url
    if _pw_process and _pw_process.is_alive():
        try:
            _pw_process.terminate()
            _pw_process.join(timeout=2)
        except Exception:
            pass
    _pw_process = None
    _pw_url = None
    return jsonify({'ok': True})


# ─── embedded browse (lite/proxy fallback) ───
@browser_bp.route('/api/browse', methods=['GET'])
def browse_embedded():
    """Fetch page HTML for iframe rendering (lite/proxy fallback)."""
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
    if mode == 'lite' or (mode == 'auto' and any(hostname.endswith(s) for s in TEXT_SITES)):
        return _browse_lite(url)
    return _browse_lite(url)  # v3.2: always lite for embedded (pywebview is primary)


# ─── proxy ───
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


# ─── extract page text for AI/reader ───
@browser_bp.route('/api/browser/extract', methods=['POST'])
def browser_extract():
    """Extract readable text from a URL for AI/reader mode."""
    data = request.json or {}
    url = data.get('url', '')
    if not url:
        return jsonify({'error': 'Sem URL'}), 400
    try:
        req = _urllib_request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html', 'Accept-Language': 'pt-PT,pt;q=0.9,en;q=0.8',
        })
        with _urllib_request.urlopen(req, context=SSL_CTX, timeout=12) as resp:
            raw = resp.read(2_000_000).decode('utf-8', errors='replace')
        title = _extract_title(raw)
        # Strip tags, keep text
        text = _re.sub(r'<script[^>]*>.*?</script>', '', raw, flags=_re.IGNORECASE | _re.DOTALL)
        text = _re.sub(r'<style[^>]*>.*?</style>', '', text, flags=_re.IGNORECASE | _re.DOTALL)
        text = _re.sub(r'<[^>]+>', ' ', text)
        text = _re.sub(r'\s+', ' ', text).strip()
        text = text[:6000]
        return jsonify({'title': title, 'text': text, 'url': url})
    except Exception as e:
        return jsonify({'error': str(e)[:200]}), 502


# ─── bookmarks ───
@browser_bp.route('/api/browser/bookmarks', methods=['GET'])
def get_bookmarks():
    return jsonify(_browser_bookmarks)


@browser_bp.route('/api/browser/bookmarks', methods=['POST'])
def add_bookmark():
    d = request.json or {}
    url, name = d.get('url', ''), d.get('name', '')
    if url and not any(b['url'] == url for b in _browser_bookmarks):
        _browser_bookmarks.append({'url': url, 'name': name or url})
    return jsonify({'ok': True, 'bookmarks': _browser_bookmarks})


@browser_bp.route('/api/browser/bookmarks', methods=['DELETE'])
def del_bookmark():
    d = request.json or {}
    url = d.get('url', '')
    global _browser_bookmarks
    _browser_bookmarks = [b for b in _browser_bookmarks if b['url'] != url]
    return jsonify({'ok': True, 'bookmarks': _browser_bookmarks})


# ─── history ───
@browser_bp.route('/api/browser/history', methods=['GET'])
def get_history():
    return jsonify(_browser_history[:50])


@browser_bp.route('/api/browser/history', methods=['POST'])
def add_history():
    d = request.json or {}
    _add_history(d.get('url', ''), d.get('title', ''))
    return jsonify({'ok': True})


@browser_bp.route('/api/browser/history', methods=['DELETE'])
def clear_history():
    global _browser_history
    _browser_history = []
    return jsonify({'ok': True})
