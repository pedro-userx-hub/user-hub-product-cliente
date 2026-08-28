import {
  getAuthSecret,
  isPublicPrototypePath,
  parseCookieHeader,
  PROTOTYPE_AUTH_COOKIE,
  verifyAuthToken,
} from "./lib/prototypeAuth";

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};

export default async function middleware(request: Request): Promise<Response | undefined> {
  const url = new URL(request.url);
  const { pathname } = url;

  if (isPublicPrototypePath(pathname)) {
    return undefined;
  }

  const token = parseCookieHeader(
    request.headers.get("cookie") ?? undefined,
    PROTOTYPE_AUTH_COOKIE,
  );
  const valid = await verifyAuthToken(token, getAuthSecret());

  if (valid) {
    return undefined;
  }

  const next = encodeURIComponent(`${pathname}${url.search}`);
  return Response.redirect(new URL(`/gate.html?next=${next}`, request.url), 302);
}
