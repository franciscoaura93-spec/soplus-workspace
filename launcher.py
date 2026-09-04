"""
S&O+ Ultra Workspace — pywebview Launcher v3.2
Starts Flask backend + opens the app in a native Edge WebView2 window.
"""
import sys
import time
import threading
import os
import traceback

os.chdir(os.path.dirname(os.path.abspath(__file__)))

LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'launcher_debug.log')

def log(msg):
    line = f"[{time.strftime('%H:%M:%S')}] {msg}"
    print(line)
    try:
        with open(LOG_FILE, 'a', encoding='utf-8') as f:
            f.write(line + '\n')
    except Exception:
        pass

PORT = 5000


def start_flask():
    from app import app
    app.run(host='127.0.0.1', port=PORT, debug=False, use_reloader=False)


def wait_for_server(host='127.0.0.1', port=PORT, timeout=10):
    import urllib.request
    import ssl
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    start = time.time()
    while time.time() - start < timeout:
        try:
            urllib.request.urlopen(f'http://{host}:{port}', timeout=2, context=ctx)
            return True
        except Exception:
            time.sleep(0.3)
    return False


def patch_edge_tracking():
    try:
        import webview.platforms.edgechromium as ec
        original_ready = ec.EdgeChrome.on_webview_ready

        def patched_on_webview_ready(self, sender, args):
            original_ready(self, sender, args)
            if args.IsSuccess:
                try:
                    profile = sender.CoreWebView2.Profile
                    from Microsoft.Web.WebView2.Core import CoreWebView2TrackingPreventionLevel
                    level = CoreWebView2TrackingPreventionLevel(0)
                    profile.set_PreferredTrackingPreventionLevel(level)
                    log("Tracking prevention set to OFF via profile API")
                except Exception as e:
                    log(f"Profile tracking prevention: {e}")

        ec.EdgeChrome.on_webview_ready = patched_on_webview_ready
        log("EdgeChrome patched for tracking prevention")
    except Exception as e:
        log(f"Could not patch EdgeChrome: {e}")


def main():
    try:
        os.remove(LOG_FILE)
    except Exception:
        pass

    log("=== LAUNCHER START ===")
    log(f"Python: {sys.executable}")
    log(f"Port: {PORT}")

    log("A arrancar Flask...")
    t = threading.Thread(target=start_flask, daemon=True)
    t.start()

    if not wait_for_server():
        log("[AVISO] Flask pode nao estar pronto, a continuar...")

    log("A abrir pywebview...")
    try:
        import webview
        log(f"pywebview module loaded OK")

        patch_edge_tracking()

        def on_started():
            log("pywebview on_started callback OK")

        tab = os.environ.get('SOPLUS_TAB') or ''
        url = f'http://127.0.0.1:{PORT}' + (f'/?tab={tab}' if tab else '')
        win = webview.create_window(
            'S+O Ultra Workspace',
            url,
            width=1400,
            height=900,
            min_size=(800, 600),
            text_select=True,
            zoomable=True,
        )
        log("Window created, calling webview.start()...")
        webview.start(debug=False, func=on_started)
        log("webview.start() RETURNED - window closed")
    except ImportError:
        log("[ERRO] pywebview nao instalado!")
        _fallback_browser()
    except Exception as e:
        log(f"[ERRO pywebview] {e}")
        log(traceback.format_exc())
        _fallback_browser()

    log("=== LAUNCHER END ===")


def _fallback_browser():
    log("A abrir no navegador como fallback...")
    import webbrowser
    tab = os.environ.get('SOPLUS_TAB') or ''
    url = f'http://127.0.0.1:{PORT}' + (f'/?tab={tab}' if tab else '')
    webbrowser.open(url)
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
