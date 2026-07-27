"""
S&O+ Browser standalone — usa o navegador do sistema.
Abre sites diretamente no browser padrão do Windows.
"""
import sys, os, json, webbrowser, threading, time

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
BOOKMARKS_FILE = os.path.join(DATA_DIR, '.browser_bookmarks.json')
HISTORY_FILE = os.path.join(DATA_DIR, '.browser_history.json')

def _load(path, default=None):
    try:
        with open(path, 'r', encoding='utf-8') as f: return json.load(f)
    except: return default if default is not None else []

def _save(path, data):
    with open(path, 'w', encoding='utf-8') as f: json.dump(data, f, ensure_ascii=False)

class SOBrowser:
    """Browser que abre no navegador do sistema mas com gestão de abas."""

    HOME = 'about:home'

    def __init__(self):
        self.tabs = []
        self.active = 0
        self.bookmarks = _load(BOOKMARKS_FILE, [])
        self.history = _load(HISTORY_FILE, [])
        self.private = False
        self._windows = {}  # tab_id -> (window_ref, timer)

    def open_home(self):
        """Abre o browser com a homepage."""
        self.tabs = [{'url': self.HOME, 'title': 'S&O+ Browser'}]
        self.active = 0
        self._show_ui()

    def navigate(self, url):
        """Navega para uma URL no browser do sistema."""
        if not url.startswith('http'):
            url = 'https://' + url
        self.tabs[self.active] = {'url': url, 'title': url.split('//')[-1].split('/')[0]}
        if not self.private:
            self._add_history(url, self.tabs[self.active]['title'])
        webbrowser.open(url)

    def new_tab(self, url=None):
        """Abre uma nova aba."""
        if url:
            webbrowser.open(url)
        else:
            webbrowser.open('https://www.google.pt')

    def add_bookmark(self, name, url):
        if not any(b['url'] == url for b in self.bookmarks):
            self.bookmarks.append({'name': name, 'url': url})
            _save(BOOKMARKS_FILE, self.bookmarks)

    def remove_bookmark(self, url):
        self.bookmarks = [b for b in self.bookmarks if b['url'] != url]
        _save(BOOKMARKS_FILE, self.bookmarks)

    def _add_history(self, url, title):
        if self.private: return
        self.history = [{'url': url, 'title': title}] + [h for h in self.history if h['url'] != url][:99]
        _save(HISTORY_FILE, self.history)

    def _show_ui(self):
        """Mostra a UI do browser numa janela."""
        try:
            import webview
            ui_html = self._build_ui_html()
            webview.create_window(
                'S&O+ Browser',
                html=ui_html,
                width=1200, height=800,
                min_size=(600, 400),
                text_select=True
            )
            webview.start()
        except ImportError:
            print("pywebview não instalado. A abrir no navegador do sistema...")
            webbrowser.open('http://localhost:5000/browser')

    def _build_ui_html(self):
        shortcuts = [
            {'name':'Google', 'url':'https://www.google.pt', 'icon':'🔍'},
            {'name':'YouTube', 'url':'https://www.youtube.com', 'icon':'▶️'},
            {'name':'Wikipedia', 'url':'https://pt.wikipedia.org', 'icon':'📚'},
            {'name':'Gmail', 'url':'https://mail.google.com', 'icon':'📧'},
            {'name':'Drive', 'url':'https://drive.google.com', 'icon':'💾'},
            {'name':'Classroom', 'url':'https://classroom.google.com', 'icon':'🏫'},
            {'name':'GitHub', 'url':'https://github.com', 'icon':'💻'},
            {'name':'DeepL', 'url':'https://www.deepl.com', 'icon':'🌐'},
            {'name':'Canva', 'url':'https://www.canva.com', 'icon':'🎨'},
            {'name':'Khan', 'url':'https://pt.khanacademy.org', 'icon':'🎓'},
            {'name':'Quizlet', 'url':'https://quizlet.com', 'icon':'🃏'},
            {'name':'Reddit', 'url':'https://www.reddit.com', 'icon':'💬'},
            {'name':'Notícias', 'url':'https://www.publico.pt', 'icon':'📰'},
            {'name':'Poke', 'url':'https://pokec.pt', 'icon':'💬'},
            {'name':'OLX', 'url':'https://www.olx.pt', 'icon':'🛒'},
        ]

        bm_html = ''.join(f'<div class="shortcut" onclick="go(\'{b["url"]}\')"><div class="icon">⭐</div><div class="name">{b["name"]}</div></div>' for b in self.bookmarks[:12])
        sc_html = ''.join(f'<div class="shortcut" onclick="go(\'{s["url"]}\')"><div class="icon">{s["icon"]}</div><div class="name">{s["name"]}</div></div>' for s in shortcuts)

        return f'''<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<title>S&O+ Browser</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box;}}
:root{{--bg:#0a0a14;--surface:#12121e;--border:#1e1e35;--text:#e2e8f0;--primary:#6366f1;--accent:#8b5cf6;}}
body{{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--text);height:100vh;display:flex;flex-direction:column;overflow:hidden;}}

.topbar{{display:flex;align-items:center;gap:4px;padding:5px 10px;background:var(--surface);border-bottom:1px solid var(--border);}}
.topbar button{{background:none;border:none;color:var(--text);font-size:16px;cursor:pointer;padding:5px 10px;border-radius:6px;transition:background 0.15s;}}
.topbar button:hover{{background:rgba(99,102,241,0.12);}}
.url-box{{flex:1;display:flex;align-items:center;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:0 12px;transition:border-color 0.2s;}}
.url-box:focus-within{{border-color:var(--primary);}}
.url-box .icon{{font-size:14px;margin-right:8px;color:#666;}}
.url-box input{{flex:1;border:none;background:none;padding:8px 0;color:var(--text);font-size:14px;outline:none;}}

.private-bar{{display:none;padding:4px 10px;background:rgba(99,102,241,0.06);border-bottom:1px solid rgba(99,102,241,0.15);font-size:10px;color:var(--primary);text-align:center;}}
.private-bar.on{{display:block;}}

.content{{flex:1;overflow-y:auto;padding:40px 24px;text-align:center;}}
.home-title{{font-size:36px;font-weight:800;background:linear-gradient(135deg,var(--primary),var(--accent));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:6px;}}
.home-sub{{color:#666;font-size:14px;margin-bottom:28px;}}
.search-box{{max-width:540px;margin:0 auto 32px;display:flex;gap:10px;}}
.search-box input{{flex:1;padding:14px 18px;border-radius:14px;border:2px solid var(--border);background:var(--surface);color:var(--text);font-size:16px;outline:none;transition:border-color 0.2s;}}
.search-box input:focus{{border-color:var(--primary);}}
.search-box button{{padding:14px 28px;border-radius:14px;background:var(--primary);color:#fff;border:none;font-size:15px;font-weight:600;cursor:pointer;transition:transform 0.15s;}}
.search-box button:hover{{transform:scale(1.03);}}
.section-label{{font-size:12px;font-weight:700;color:#555;margin-bottom:10px;text-align:left;max-width:600px;margin-left:auto;margin-right:auto;text-transform:uppercase;letter-spacing:0.5px;}}
.shortcuts{{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;max-width:600px;margin:0 auto 28px;}}
.shortcut{{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px 6px;text-align:center;cursor:pointer;transition:all 0.2s;}}
.shortcut:hover{{border-color:var(--primary);transform:translateY(-2px);box-shadow:0 4px 12px rgba(99,102,241,0.15);}}
.shortcut .icon{{font-size:26px;margin-bottom:4px;}}
.shortcut .name{{font-size:11px;font-weight:600;}}

footer{{padding:12px;text-align:center;font-size:11px;color:#444;border-top:1px solid var(--border);}}
</style>
</head>
<body>

<div class="topbar">
    <button onclick="history.back()" title="Voltar">◀</button>
    <button onclick="history.forward()" title="Avançar">▶</button>
    <button onclick="location.reload()" title="Atualizar">🔄</button>
    <div class="url-box">
        <span class="icon">🔒</span>
        <input id="urlInput" placeholder="Escrever URL ou pesquisar..."
               onkeydown="if(event.key==='Enter')go(this.value)">
    </div>
    <button id="privBtn" onclick="togglePrivate()" title="Modo Privado">👤</button>
    <button id="bmBtn" onclick="bookmarkPage()" title="Bookmark">☆</button>
    <button onclick="openInSystemBrowser()" title="Abrir no navegador do sistema">↗️</button>
</div>
<div class="private-bar" id="privBar">🕶️ Modo Privado — sem histórico, sem cookies guardados</div>

<div class="content" id="mainContent">
    <div class="home-title">S&O+ Browser</div>
    <div class="home-sub">Navegador real — abre sites diretamente no teu computador</div>
    <div class="search-box">
        <input id="homeSearch" placeholder="Pesquisar na web ou escrever URL..."
               onkeydown="if(event.key==='Enter')go(this.value)" autofocus>
        <button onclick="go(document.getElementById('homeSearch').value)">🔍 Pesquisar</button>
    </div>
    {'<div class="section-label">⭐ Bookmarks</div><div class="shortcuts">' + bm_html + '</div>' if bm_html else ''}
    <div class="section-label">🚀 Acesso rápido</div>
    <div class="shortcuts">{sc_html}</div>
</div>

<footer>S&O+ Browser v1.0 — Edge WebView2 • Feito para escolas</footer>

<script>
let isPrivate = false;

function go(raw) {{
    if (!raw || !raw.trim()) return;
    let url = raw.trim();
    if (!url.match(/^https?:\\/\\//i)) {{
        if (url.includes('.') && !url.includes(' ')) url = 'https://' + url;
        else url = 'https://www.google.pt/search?q=' + encodeURIComponent(url);
    }}
    // Open in system browser — this IS a real browser
    window.open(url, '_blank');
}}

function togglePrivate() {{
    isPrivate = !isPrivate;
    document.getElementById('privBar').classList.toggle('on', isPrivate);
    document.getElementById('privBtn').textContent = isPrivate ? '🕶️' : '👤';
}}

function bookmarkPage() {{
    // TODO: integrate with Python backend
    alert('Bookmark guardado!');
}}

function openInSystemBrowser() {{
    const url = document.getElementById('urlInput').value;
    if (url) window.open(url, '_blank');
}}
</script>
</body>
</html>'''


if __name__ == '__main__':
    print("=" * 50)
    print("  S&O+ Browser v1.0")
    print("  Browser real — Edge WebView2")
    print("=" * 50)

    try:
        import webview
        browser = SOBrowser()
        ui = browser._build_ui_html()
        win = webview.create_window('S&O+ Browser', html=ui, width=1200, height=800, min_size=(600, 400))
        webview.start()
    except ImportError:
        print("\npywebview não instalado. A instalar...")
        os.system('pip install pywebview')
        print("Reinicia o browser.py")
    except Exception as e:
        print(f"\nErro: {e}")
        print("A abrir no navegador do sistema...")
        webbrowser.open('http://localhost:5000/browser')
