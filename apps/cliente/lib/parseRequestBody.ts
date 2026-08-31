import type { VercelRequest } from "@vercel/node";

function readRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!req.readable) {
      resolve("");
      return;
    }

    const chunks: Uint8Array[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk as Uint8Array));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export function parseJsonBody(req: VercelRequest): Record<string, unknown> {
  const { body } = req;

  if (body == null) return {};

  if (typeof body === "object" && !Buffer.isBuffer(body)) {
    return body as Record<string, unknown>;
  }

  if (typeof body === "string" && body.length > 0) {
    try {
      const parsed: unknown = JSON.parse(body);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }

  return {};
}

function passwordFromRecord(record: Record<string, unknown>): string {
  return typeof record.password === "string" ? record.password : "";
}

export async function readPassword(req: VercelRequest): Promise<string> {
  const fromParsedBody = passwordFromRecord(parseJsonBody(req));
  if (fromParsedBody) return fromParsedBody;

  const raw = await readRawBody(req);
  if (!raw) return "";

  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return passwordFromRecord(parsed as Record<string, unknown>);
    }
  } catch {
    return "";
  }

  return "";
}
