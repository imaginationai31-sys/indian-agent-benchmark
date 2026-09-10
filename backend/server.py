import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from evaluator import evaluate_task

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
FRONTEND = ROOT / "frontend"


def load_json(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


PRODUCTS = load_json("products.json")
TASKS = load_json("ecommerce_tasks.json") + load_json("adversarial_tasks.json") + load_json("v02_tasks.json")


class Handler(BaseHTTPRequestHandler):
    def send_json(self, payload, status=200):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        self.send_json({"ok": True})

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/products":
            return self.send_json(PRODUCTS)
        if path == "/api/tasks":
            return self.send_json(TASKS)
        if path == "/api/health":
            return self.send_json({"ok": True, "version": "0.2", "task_count": len(TASKS)})
        if path == "/" or path == "/index.html":
            return self.serve_file(FRONTEND / "index.html", "text/html")
        if path.startswith("/frontend/"):
            candidate = FRONTEND / path.removeprefix("/frontend/")
            return self.serve_file(candidate)
        self.send_json({"error": "Not found"}, 404)

    def do_POST(self):
        path = urlparse(self.path).path
        if path != "/api/evaluate":
            return self.send_json({"error": "Not found"}, 404)
        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = json.loads(self.rfile.read(length) or b"{}")
            task = next(t for t in TASKS if t["task_id"] == body["task_id"])
            result = evaluate_task(task, PRODUCTS, body.get("trajectory", {}))
            return self.send_json(result)
        except StopIteration:
            return self.send_json({"error": "Unknown task"}, 400)
        except Exception as exc:
            return self.send_json({"error": str(exc)}, 400)

    def serve_file(self, path, content_type=None):
        if not path.exists() or not path.is_file():
            return self.send_json({"error": "Not found"}, 404)
        suffix = path.suffix.lower()
        content_type = content_type or {".css": "text/css", ".js": "application/javascript", ".json": "application/json"}.get(suffix, "text/plain")
        raw = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", f"{content_type}; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


if __name__ == "__main__":
    port = 8000
    print(f"Simulator running at http://localhost:{port}")
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
