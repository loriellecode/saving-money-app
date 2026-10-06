// Minimal static file server for local development: `npm start` -> http://localhost:3000
// Port 3000 matches Supabase's default Site URL, so email confirmation links land here.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 3000;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function notFound(res) {
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
}

http
  .createServer((req, res) => {
    let urlPath;
    try {
      urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    } catch {
      return notFound(res);
    }
    const file = path.join(ROOT, urlPath === "/" ? "index.html" : urlPath);
    // Block path traversal and dotfiles (.git, .env, ...).
    const rel = path.relative(ROOT, file);
    if (rel.split(path.sep).some((part) => part.startsWith("."))) return notFound(res);

    fs.readFile(file, (err, body) => {
      if (err) return notFound(res);
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
      res.end(body);
    });
  })
  .listen(PORT, () => console.log(`Stack Saver running at http://localhost:${PORT}`));
