"""
moodle.py — S&O+ Ultra Workspace ↔ Moodle Bridge
═══════════════════════════════════════════════════
Ficheiro autónomo. O app chama, moodle.py verifica permissão e encaminha para o Moodle real.
Ninguém toca no Moodle diretamente — tudo passa por aqui.

Uso:
    from moodle import MoodleBridge
    m = MoodleBridge(authorization="chave_dev_aqui")
    cursos = m.cursos()
"""

import json
import http.client
import ssl
from urllib.parse import urlencode, urlparse
from datetime import datetime


# ════════════════════════════════════════════════════════════
#  CONFIGURAÇÃO — preencher com dados do teu Moodle
# ════════════════════════════════════════════════════════════

_MOODLE_URL = ""    # ex: https://moodle.escola.pt
_MOODLE_TOKEN = ""  # web service token
_DEV_KEY = "soplus-moodle-dev-key-2026"  # chave de autorização do dev


# ════════════════════════════════════════════════════════════
#  CLASSE PRINCIPAL
# ════════════════════════════════════════════════════════════

class MoodleBridge:
    """
    Ponte entre o S&O+ Workspace e o Moodle.
    Todas as chamadas passam por verificação de autorização.
    """

    def __init__(self, authorization="", moodle_url="", moodle_token=""):
        self._auth = authorization
        self._url = moodle_url or _MOODLE_URL
        self._token = moodle_token or _MOODLE_TOKEN
        self._authorized = False
        self._check_auth()

    def _check_auth(self):
        """Verifica se a autorização do dev é válida."""
        if self._auth == _DEV_KEY:
            self._authorized = True
        else:
            self._authorized = False

    def _require_auth(self):
        """Bloqueia se não houver autorização."""
        if not self._authorized:
            raise PermissionError("Autorização inválida. Chama o MoodleBridge com a chave dev correta.")
        if not self._url or not self._token:
            raise ValueError("MOODLE_URL e MOODLE_TOKEN devem estar configurados em moodle.py")

    def _request(self, wsfunction, params=None):
        """Pedido REST ao Moodle. Só avança se autorizado."""
        self._require_auth()
        if params is None:
            params = {}
        params['wstoken'] = self._token
        params['wsfunction'] = wsfunction
        params['moodlewsrestformat'] = 'json'

        parsed = urlparse(self._url)
        host = parsed.hostname
        port = 443 if parsed.scheme == 'https' else 80
        path = parsed.path.rstrip('/') + '/webservice/rest/server.php'

        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        query = urlencode(params)
        conn = http.client.HTTPSConnection(host, port, timeout=30, context=ctx) if parsed.scheme == 'https' \
            else http.client.HTTPConnection(host, port, timeout=30)
        conn.request('GET', f'{path}?{query}')
        resp = conn.getresponse()
        data = resp.read().decode()
        conn.close()

        try:
            return json.loads(data)
        except Exception:
            return {'error': 'Resposta inválida do Moodle', 'raw': data[:500]}

    def _log(self, action, params=None):
        """Log de auditoria — regista cada chamada ao Moodle."""
        entry = {
            'time': datetime.now().isoformat(),
            'action': action,
            'params': params or {},
            'authorized': self._authorized
        }
        # Log para ficheiro local
        try:
            with open('moodle_log.json', 'a') as f:
                f.write(json.dumps(entry) + '\n')
        except Exception:
            pass
        return entry

    # ─── VERIFICAÇÃO ──────────────────────────────────────

    def status(self):
        """Testa ligação ao Moodle."""
        try:
            info = self._request('core_webservice_get_site_info')
            if 'error' in info:
                return {'ok': False, 'erro': info['error'], 'authorized': self._authorized}
            self._log('test_connection')
            return {'ok': True, 'site': info.get('sitename', ''), 'userid': info.get('userid', 0), 'authorized': True}
        except PermissionError as e:
            return {'ok': False, 'erro': str(e), 'authorized': False}
        except Exception as e:
            return {'ok': False, 'erro': str(e), 'authorized': self._authorized}

    # ─── LEITURA (app ← moodle) ───────────────────────────

    def cursos(self, userid=None):
        """Busca cursos inscritos no Moodle."""
        self._log('get_courses', {'userid': userid})
        params = {}
        if userid:
            params['userid'] = userid
        return self._request('core_course_get_enrolled_courses_by_timeline', params)

    def notas(self, courseid=None, userid=None):
        """Busca notas do Moodle."""
        self._log('get_grades', {'courseid': courseid, 'userid': userid})
        params = {}
        if courseid:
            params['courseids[0]'] = courseid
        if userid:
            params['userid'] = userid
        return self._request('core_grades_get_grades', params)

    def testes(self, courseids=None):
        """Busca testes/trabalhos do Moodle."""
        self._log('get_assignments', {'courseids': courseids})
        params = {}
        if courseids:
            for i, cid in enumerate(courseids):
                params[f'courseids[{i}]'] = cid
        return self._request('mod_assign_get_assignments', params)

    def horario(self, courseid):
        """Busca conteúdo/horário de um curso."""
        self._log('get_schedule', {'courseid': courseid})
        return self._request('core_course_get_contents', {'courseid': courseid})

    def eventos(self, courseids=None):
        """Busca eventos próximos."""
        self._log('get_events')
        params = {}
        if courseids:
            for i, cid in enumerate(courseids):
                params[f'courseids[{i}]'] = cid
        return self._request('core_calendar_get_calendar_events', params)

    def submissao(self, assignid, userid):
        """Estado de submissão de um trabalho."""
        self._log('get_submission', {'assignid': assignid, 'userid': userid})
        return self._request('mod_assign_get_submission_status', {
            'assignid': assignid, 'userid': userid
        })

    def utilizadores(self, userids):
        """Busca dados de utilizadores."""
        self._log('get_users', {'userids': userids})
        params = {}
        for i, uid in enumerate(userids):
            params[f'values[{i}]'] = uid
        return self._request('core_user_get_users_by_field', params)

    def site_info(self):
        """Info do site Moodle."""
        self._log('site_info')
        return self._request('core_webservice_get_site_info')

    # ─── ESCRITA (app → moodle) ───────────────────────────

    def criar_teste(self, courseid, name, description="", duedate=0, grade=100):
        """Cria um teste/trabalho no Moodle a partir da app."""
        self._log('create_assignment', {'courseid': courseid, 'name': name})
        return self._request('mod_assign_add_assignment', {
            'courseid': courseid,
            'name': name,
            'description': description,
            'descriptionformat': 1,
            'duedate': duedate,
            'grade': grade
        })

    def criar_quiz(self, courseid, name, description="", timeopen=0, timeclose=0, grade=100):
        """Cria um quiz no Moodle a partir da app."""
        self._log('create_quiz', {'courseid': courseid, 'name': name})
        return self._request('mod_quiz_add_quiz', {
            'courseid': courseid,
            'name': name,
            'description': description,
            'descriptionformat': 1,
            'timeopen': timeopen,
            'timeclose': timeclose,
            'grade': grade
        })

    def submeter_teste(self, assignid, userid, plugindata=None):
        """Submete um trabalho no Moodle a partir da app."""
        self._log('submit_assignment', {'assignid': assignid, 'userid': userid})
        params = {'assignid': assignid, 'userid': userid}
        if plugindata:
            params['plugindata'] = json.dumps(plugindata)
        return self._request('mod_assign_save_submission', params)

    def registar_nota(self, userid, itemid, grade, feedback=""):
        """Regista uma nota no Moodle a partir da app."""
        self._log('update_grade', {'userid': userid, 'itemid': itemid, 'grade': grade})
        return self._request('core_grades_update_grades', {
            'userid': userid, 'itemid': itemid, 'grade': grade, 'feedback': feedback
        })

    def criar_curso(self, fullname, shortname, categoryid=0):
        """Cria um curso no Moodle a partir da app."""
        self._log('create_course', {'fullname': fullname})
        return self._request('core_course_create_courses', {
            'courses[0][fullname]': fullname,
            'courses[0][shortname]': shortname,
            'courses[0][categoryid]': categoryid
        })

    def atualizar_curso(self, courseid, fullname=None, shortname=None):
        """Atualiza dados de um curso no Moodle."""
        self._log('update_course', {'courseid': courseid})
        params = {'courses[0][id]': courseid}
        if fullname:
            params['courses[0][fullname]'] = fullname
        if shortname:
            params['courses[0][shortname]'] = shortname
        return self._request('core_course_update_courses', params)


# ════════════════════════════════════════════════════════════
#  EXEMPLO DE USO
# ════════════════════════════════════════════════════════════

if __name__ == '__main__':
    # Teste rápido
    m = MoodleBridge(authorization=_DEV_KEY)
    print(json.dumps(m.status(), indent=2, ensure_ascii=False))
    # cursos = m.cursos()
    # print(json.dumps(cursos, indent=2, ensure_ascii=False))
