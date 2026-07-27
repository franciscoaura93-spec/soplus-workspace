"""
S&O+ Ultra Workspace — pywebview Launcher v3.2
Starts Flask backend + opens the app in a native Edge WebView2 window.
"""
import sys
import time
import threading
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

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


def main():
    print("  A arrancar Flask...")
    t = threading.Thread(target=start_flask, daemon=True)
    t.start()

    if not wait_for_server():
        print("  [AVISO] Flask pode nao estar pronto, a continuar...")

    print("  A abrir pywebview (Edge WebView2)...")
    try:
        import webview

        def on_started():
            print("  pywebview aberto com sucesso!")

        webview.create_window(
            'S+O Ultra Workspace',
            f'http://127.0.0.1:{PORT}',
            width=1400,
            height=900,
            min_size=(800, 600),
            text_select=True,
            zoomable=True,
        )
        webview.start(debug=False, func=on_started)
    except ImportError:
        print("  [ERRO] pywebview nao instalado!")
        print("  Corre: pip install pywebview")
        _fallback_browser()
    except Exception as e:
        print(f"  [ERRO pywebview: {e}]")
        _fallback_browser()


def _fallback_browser():
    print("  A abrir no navegador como fallback...")
    import webbrowser
    webbrowser.open(f'http://127.0.0.1:{PORT}')
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
