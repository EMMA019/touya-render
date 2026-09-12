import { debugUnlimitedEnabled } from "@/lib/config";
import { jsonApi } from "@/lib/cors";

export const dynamic = "force-dynamic";
export { OPTIONS } from "@/lib/cors";

export function GET(request: Request) {
  return jsonApi(request, {
    ok: true,
    app: "touya",
    debugUnlimited: debugUnlimitedEnabled(),
  });
}
