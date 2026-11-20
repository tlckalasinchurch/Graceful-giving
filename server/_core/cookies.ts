import type { CookieOptions, Request } from "express";

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  // No `domain` is set on purpose: the session cookie stays host-only, so
  // no localhost/IP special-casing is needed here.
  const secure = isSecureRequest(req);

  return {
    httpOnly: true,
    path: "/",
    // Lax: the session cookie is first-party only. It still travels on the
    // top-level redirect back from LINE Login. The app is not embedded cross-site.
    sameSite: "lax",
    secure,
  };
}
