import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readPassword } from "../lib/parseRequestBody";
import {
  buildAuthCookie,
  createAuthToken,
  getAuthSecret,
  getPrototypePassword,
  timingSafeEqual,
} from "../lib/prototypeAuth";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "method_not_allowed" });
    return;
  }

  try {
    const password = await readPassword(req);
    const expected = getPrototypePassword();

    if (!password || !timingSafeEqual(password, expected)) {
      res.status(401).json({ ok: false, error: "invalid_password" });
      return;
    }

    const token = await createAuthToken(getAuthSecret());
    const secure =
      process.env.VERCEL === "1" || process.env.NODE_ENV === "production";

    res.setHeader("Set-Cookie", buildAuthCookie(token, secure));
    res.status(200).json({ ok: true });
  } catch {
    res.status(500).json({ ok: false, error: "server_error" });
  }
}
