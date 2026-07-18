#!/usr/bin/env python3
"""nyth hub v0 — 一个文件的家庭枢纽（纯标准库，零依赖）。

角色：serve nyth-l1 静态应用 + 跨设备记忆同步中继。数据不出你的局域网：
op-log 持久在本文件旁的 oplog.jsonl（append-only），没有任何第三方云。

跑法:  python3 hub/serve.py [port]     # 默认 4173
设备端: 同一局域网内浏览器打开 http://<这台机器的IP>:4173

同步协议（协议级，任何客户端可实现）:
  POST /api/sync/push   body={"ops":[{opId,deviceId,ts,kind,k,v}]}  -> {"accepted":N,"seq":S}
  GET  /api/sync/pull?since=N                                        -> {"ops":[...],"seq":S}
op 为 append-only；合并语义由客户端执行（同 k 以最新 ts 胜 / forget 同规则）。
"""
import json, os, sys, threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # nyth-l1/
OPLOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "oplog.jsonl")
LOCK = threading.Lock()
OPS = []          # [{seq, ...op}]
SEEN = set()      # opId 去重

def load():
    if os.path.exists(OPLOG):
        with open(OPLOG, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    op = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if op.get("opId") in SEEN:
                    continue
                OPS.append(op)
                SEEN.add(op.get("opId"))

def append(ops):
    accepted = 0
    with LOCK:
        with open(OPLOG, "a", encoding="utf-8") as f:
            for op in ops:
                oid = op.get("opId")
                if not oid or oid in SEEN:
                    continue
                if op.get("kind") not in ("remember", "forget", "clear"):
                    continue
                op["seq"] = len(OPS) + 1
                OPS.append(op)
                SEEN.add(oid)
                f.write(json.dumps(op, ensure_ascii=False) + "\n")
                accepted += 1
    return accepted

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/api/sync/pull"):
            try:
                since = int((self.path.split("since=")[1]).split("&")[0]) if "since=" in self.path else 0
            except ValueError:
                since = 0
            with LOCK:
                ops = [o for o in OPS if o.get("seq", 0) > since]
                seq = len(OPS)
            return self._json(200, {"ops": ops, "seq": seq})
        if self.path == "/api/sync/status":
            with LOCK:
                return self._json(200, {"seq": len(OPS), "devices": len({o.get("deviceId") for o in OPS})})
        return super().do_GET()

    def do_POST(self):
        if self.path == "/api/sync/push":
            try:
                n = int(self.headers.get("Content-Length", 0))
                data = json.loads(self.rfile.read(n) or b"{}")
                ops = data.get("ops", [])
                assert isinstance(ops, list) and len(ops) <= 500
            except Exception:
                return self._json(400, {"error": "bad request"})
            accepted = append(ops)
            with LOCK:
                seq = len(OPS)
            return self._json(200, {"accepted": accepted, "seq": seq})
        return self._json(404, {"error": "not found"})

    def log_message(self, fmt, *args):  # 安静日志
        if "/api/sync" not in (args[0] if args else ""):
            super().log_message(fmt, *args)

class ThreadingHTTP(ThreadingMixIn, HTTPServer):
    daemon_threads = True

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
    load()
    print(f"nyth hub v0 · serving {ROOT} · oplog {len(OPS)} ops · http://0.0.0.0:{port}")
    ThreadingHTTP(("0.0.0.0", port), Handler).serve_forever()
