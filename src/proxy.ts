import { NextResponse, type NextRequest } from "next/server";
import { isInstallUuid } from "@/lib/install-uuid";
import { ANON_COOKIE, ANON_HEADER, VISITOR_COOKIE } from "@/lib/config";

/**
 * Pass through a client-generated install UUID. Do not mint identities
 * on the server and do not collect PII.
 */
export function proxy(request: NextRequest) {
  const headerId = request.headers.get(ANON_HEADER)?.trim();
  const cookieId =
    request.cookies.get(ANON_COOKIE)?.value ??
    request.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId =
    (isInstallUuid(headerId) ? headerId : null) ??
    (isInstallUuid(cookieId) ? cookieId : null);

  const headers = new Headers(request.headers);
  if (visitorId) headers.set(ANON_HEADER, visitorId);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
