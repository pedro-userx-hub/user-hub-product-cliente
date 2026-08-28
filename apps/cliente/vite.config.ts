import react from "@vitejs/plugin-react";
import type { IncomingMessage } from "node:http";
import { defineConfig, type Plugin } from "vite";
import {
  buildAuthCookie,
  createAuthToken,
  getAuthSecret,
  getPrototypePassword,
  isPublicPrototypePath,
  parseCookieHeader,
  PROTOTYPE_AUTH_COOKIE,
  timingSafeEqual,
  verifyAuthToken,
} from "./lib/prototypeAuth";

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    req.on("data", (chunk) => chunks.push(chunk as Uint8Array));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function prototypeAuthDevPlugin(): Plugin {
  return {
    name: "prototype-auth-dev",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "/";
        const pathname = url.split("?")[0] ?? "/";

        if (pathname === "/api/prototype-session" && req.method === "GET") {
          const token = parseCookieHeader(req.headers.cookie, PROTOTYPE_AUTH_COOKIE);
          const valid = await verifyAuthToken(token, getAuthSecret());
          res.statusCode = valid ? 200 : 401;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: valid }));
          return;
        }

        if (pathname === "/api/prototype-auth" && req.method === "POST") {
          try {
            const body = (await readJsonBody(req)) as { password?: string };
            const password = typeof body.password === "string" ? body.password : "";
            const expected = getPrototypePassword();

            if (!password || !timingSafeEqual(password, expected)) {
              res.statusCode = 401;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: false, error: "invalid_password" }));
              return;
            }

            const token = await createAuthToken(getAuthSecret());
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Set-Cookie", buildAuthCookie(token, false));
            res.end(JSON.stringify({ ok: true }));
          } catch {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: false, error: "bad_request" }));
          }
          return;
        }

        if (isPublicPrototypePath(pathname)) {
          next();
          return;
        }

        const token = parseCookieHeader(req.headers.cookie, PROTOTYPE_AUTH_COOKIE);
        const valid = await verifyAuthToken(token, getAuthSecret());
        if (valid) {
          next();
          return;
        }

        const nextParam = encodeURIComponent(url);
        res.statusCode = 302;
        res.setHeader("Location", `/gate.html?next=${nextParam}`);
        res.end();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), prototypeAuthDevPlugin()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
});
