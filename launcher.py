"""
S&O+ Ultra Workspace — pywebview Launcher
Starts Flask backend + opens the app in a native Edge WebView2 window.
"""
import sys
import time
import threading
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))


def start_flask():
    from app import app
    app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)


def main():
    # Start Flask in background thread
    t = threading.Thread(target=start_flask, daemon=True)
    t.start()

    # Wait for Flask to be ready
    time.sleep(1.5)

    # Open pywebview as the main app window
    try:
        import webview
        webview.create_window(
            'S&O+ Ultra Workspace',
            'http://localhost:5000',
            width=1400,
            height=900,
            min_size=(800, 600),
            text_select=True,
            zoomable=True,
        )
        webview.start(debug=False)
    except ImportError:
        print("[ERRO] pywebview nao instalado. Corre: pip install pywebview")
        print("A abrir no navegador como fallback...")
        import webbrowser
        webbrowser.open('http://localhost:5000')
        # Keep Flask alive
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
    except Exception as e:
        print(f"[ERRO pywebview: {e}]")
        print("A abrir no navegador como fallback...")
        import webbrowser
        webbrowser.open('http://localhost:5000')
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    main()
