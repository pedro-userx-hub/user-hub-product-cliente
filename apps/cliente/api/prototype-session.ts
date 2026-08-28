import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getAuthSecret,
  parseCookieHeader,
  PROTOTYPE_AUTH_COOKIE,
  verifyAuthToken,
} from "../lib/prototypeAuth";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  const token = parseCookieHeader(req.headers.cookie, PROTOTYPE_AUTH_COOKIE);
  const valid = await verifyAuthToken(token, getAuthSecret());

  if (!valid) {
    res.status(401).json({ ok: false });
    return;
  }

  res.status(200).json({ ok: true });
}
