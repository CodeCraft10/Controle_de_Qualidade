"""Smoke do index público com PHP local ou imagem Apache descartável."""
import argparse
import json
import os
from pathlib import Path
import re
import secrets
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument('--docker-image')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
count = 0

def check(condition, message):
    global count
    assert condition, message
    count += 1
    print(f'ok {count} - {message}')

def request(path, method='GET', body=None, token=None):
    headers = {}
    if body is not None:
        headers['Content-Type'] = 'application/json'
        body = json.dumps(body).encode()
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(base + path, data=body, headers=headers, method=method)
    try:
        response = urllib.request.urlopen(req, timeout=10)
    except urllib.error.HTTPError as error:
        response = error
    return response.status, response.headers, response.read()

container = None
process = None
password = secrets.token_urlsafe(24)
with tempfile.TemporaryDirectory(prefix='gp4-entry-') as temporary:
    log = open(Path(temporary) / 'server.log', 'wb')
    try:
        if args.docker_image:
            container = 'gp4-smoke-' + secrets.token_hex(5)
            subprocess.run(['docker', 'run', '-d', '--name', container, '-p', '127.0.0.1::80', args.docker_image], check=True, stdout=subprocess.DEVNULL)
            address = subprocess.check_output(['docker', 'port', container, '80/tcp'], text=True).strip()
            base = 'http://' + address
            bootstrap = ['docker', 'exec', '-i', '--user', 'www-data', container, 'php', 'backend/bin/create-admin.php']
            env = None
        else:
            php = os.environ.get('PHP_BIN', 'php')
            with socket.socket() as sock:
                sock.bind(('127.0.0.1', 0))
                port = sock.getsockname()[1]
            base = f'http://127.0.0.1:{port}'
            env = {**os.environ, 'STORAGE_PATH': str(Path(temporary) / 'state.json')}
            bootstrap = [php, 'backend/bin/create-admin.php']
            process = subprocess.Popen([php, '-S', f'127.0.0.1:{port}', '-t', 'public', 'public/index.php'], cwd=root, env=env, stdout=log, stderr=log)
        subprocess.run(bootstrap, input=f'Smoke\nsmoke@example.test\n{password}\n', text=True, cwd=root, env=env, check=True, stdout=subprocess.DEVNULL)
        for _ in range(100):
            try:
                if request('/api/health')[0] == 200:
                    break
            except (OSError, urllib.error.URLError):
                pass
            time.sleep(0.2)
        else:
            raise RuntimeError('Servidor não iniciou')
        status, headers, html = request('/')
        check(status == 200 and b'<html' in html, 'index entrega interface compilada')
        check("default-src 'self'" in headers.get('Content-Security-Policy', ''), 'CSP da interface aplicada')
        assets = re.findall(rb'(?:src|href)="(/assets/[^\"]+)"', html)
        check(len(assets) >= 2, 'HTML referencia JS e CSS compilados')
        for asset in assets:
            status, headers, content = request(asset.decode())
            check(status == 200 and len(content) > 0, 'asset disponível: ' + asset.decode())
        check(request('/index.php')[0] == 200, 'acesso direto a index.php')
        check(request('/', 'HEAD')[2] == b'', 'HEAD não retorna corpo')
        for private in ['/.env', '/backend/var/state.json', '/backend/bootstrap.php', '/frontend/src/main.js', '/.git/config', '/assets/../backend/var/state.json']:
            check(request(private)[0] == 404, 'arquivo privado bloqueado: ' + private)
        check(request('/api/produtos')[0] == 401, 'API exige autenticação na mesma origem')
        status, _, content = request('/api/auth/login', 'POST', {'email': 'smoke@example.test', 'senha': password})
        check(status == 200, 'login funciona na entrada pública')
        token = json.loads(content)['token']
        status, _, content = request('/api/produtos', 'POST', {'codigo': 'SMOKE', 'nome': 'Produto smoke'}, token)
        check(status == 201 and json.loads(content)['nome'] == 'Produto smoke', 'cadastro persiste via index')
        check(request('/api/auth/logout', 'POST', token=token)[0] == 204, 'logout revoga sessão')
        check(request('/api/produtos', token=token)[0] == 401, 'token revogado é bloqueado')
        print(f'\n{count} verificações da entrada pública passaram.')
    finally:
        if process:
            process.terminate()
            process.wait(timeout=10)
        if container:
            subprocess.run(['docker', 'rm', '-f', container], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        log.close()
