# 全仓密钥扫描（快速版）：单次 cat-file --batch 流内完成模式扫描 + 精确凭据匹配
# 只输出命中路径与模式类别，绝不打印命中值
# 用法: python scripts/_secret-scan.py
import subprocess, re, pathlib, json, os, sys, tempfile

# Windows 控制台/管道捕获下统一 UTF-8 输出，避免 GBK 编码错误/乱码
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

ROOT = pathlib.Path(r'D:\pi-martix-ui-dev')
SKIP_DIRS = {'node_modules', '.git', 'dist', 'dist-renderer', 'dist-main', 'graphify-out', '.vite', '.pi', 'eccToolkit'}
MAX_FILE = 2_000_000

PATTERNS = [
    ("github-classic", re.compile(rb'gh[pousr]_[A-Za-z0-9]{30,}')),
    ("github-fine-grained", re.compile(rb'github_pat_[A-Za-z0-9_]{22,}')),
    ("npm-token", re.compile(rb'npm_[A-Za-z0-9]{36,}')),
    ("openai", re.compile(rb'sk-[A-Za-z0-9]{20,}')),
    ("anthropic", re.compile(rb'sk-ant-[A-Za-z0-9_-]{20,}')),
    ("google-api", re.compile(rb'AIza[0-9A-Za-z_-]{35}')),
    ("aws", re.compile(rb'AKIA[0-9A-Z]{16}')),
    ("slack", re.compile(rb'xox[baprs]-[A-Za-z0-9-]{10,}')),
    ("jwt", re.compile(rb'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}')),
    ("pem", re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY')),
    ("authToken-field", re.compile(rb'[_-]?authToken\s*[:=]', re.I)),
    ("generic-key-field", re.compile(rb'(?:api[_-]?key|apikey|access[_-]?token|secret)\s*[:=]\s*[\'"][A-Za-z0-9_\-.]{16,}[\'"]', re.I)),
]

# ---- 真实凭据（不打印） ----
creds = []
home = pathlib.Path.home()
auth = home / '.pi' / 'agent' / 'auth.json'
if auth.exists():
    try:
        a = json.loads(auth.read_text(encoding='utf8'))
        stack = [a]
        while stack:
            v = stack.pop()
            if isinstance(v, dict):
                stack.extend(v.values())
            elif isinstance(v, list):
                stack.extend(v)
            elif isinstance(v, str) and len(v) >= 16:
                creds.append(v)
    except Exception:
        pass
for k in ('GITHUB_PAT', 'GITEE_TOKEN'):
    if os.environ.get(k):
        creds.append(os.environ[k])
try:
    npm_tok = subprocess.run(['npm', 'config', 'get', '//registry.npmjs.org/:_authToken'], capture_output=True).stdout.decode('ascii', 'ignore').strip()
    if npm_tok and len(npm_tok) >= 16 and 'undefined' not in npm_tok:
        creds.append(npm_tok)
except Exception:
    pass
creds_bytes = [c.encode() for c in creds]

hits = []
exact = []


def scan(data: bytes, label: str):
    for name, rx in PATTERNS:
        if rx.search(data):
            hits.append(f"{name}\t{label}")
    for cb in creds_bytes:
        if cb in data:
            exact.append(label)


# ---- 1. 工作树（含产物；排除依赖/构建缓存/大文件） ----
file_count = 0
for p in ROOT.rglob('*'):
    if not p.is_file():
        continue
    if any(part in SKIP_DIRS for part in p.parts):
        continue
    try:
        if p.stat().st_size > MAX_FILE:
            continue
        data = p.read_bytes()
    except OSError:
        continue
    if data:
        file_count += 1
        scan(data, f"worktree:{p.relative_to(ROOT)}")

# ---- 2. git 历史 blobs + fsck 游离对象（单次 cat-file --batch 流式） ----
blobs = set()
rev = subprocess.run(['git', 'rev-list', '--objects', '--all'], cwd=ROOT, capture_output=True).stdout.decode('ascii', 'ignore')
for line in rev.splitlines():
    if line:
        blobs.add(line.split()[0])
fsck = subprocess.run(['git', 'fsck', '--unreachable', '--no-reflogs'], cwd=ROOT, capture_output=True).stdout.decode('ascii', 'ignore')
for line in fsck.splitlines():
    if ' blob ' in line:
        blobs.add(line.split()[-1])

# 死锁修复：sha 列表先写入临时文件，cat-file --batch 的 stdin 从文件重定向。
# 旧实现把全部 sha 经管道写入 stdin——管道缓冲（~64KB）写满时 git 阻塞读、
# Python 阻塞写，双方互等死锁；文件重定向后单进程同步读 stdout 无死锁。
tmp_path = None
try:
    with tempfile.NamedTemporaryFile(prefix='secret-scan-blobs-', suffix='.txt', delete=False) as tf:
        tmp_path = tf.name
        for b in blobs:
            tf.write((b + '\n').encode('ascii'))
    blob_count = 0
    with open(tmp_path, 'rb') as f:
        proc = subprocess.Popen(['git', 'cat-file', '--batch'], cwd=ROOT, stdin=f, stdout=subprocess.PIPE)
        while True:
            header = proc.stdout.readline()
            if not header:
                break
            parts = header.decode('ascii', 'ignore').strip().split()
            if len(parts) != 3 or parts[1] != 'blob':
                continue
            try:
                size = int(parts[2])
            except ValueError:
                continue
            if size > MAX_FILE:
                proc.stdout.read(size + 1)
                continue
            data = proc.stdout.read(size)
            proc.stdout.read(1)
            blob_count += 1
            if data:
                scan(data, f"git-blob:{parts[0][:12]}")
finally:
    if tmp_path:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

print(f"scanned: worktree_files={file_count} blobs={blob_count} creds={len(creds)}")
print("=== 模式扫描命中 ===")
if not hits:
    print("0 hits")
for h in sorted(set(hits)):
    print(h)
print("=== 精确凭据匹配 ===")
if not exact:
    print("0 hits")
for h in sorted(set(exact)):
    print(h)
