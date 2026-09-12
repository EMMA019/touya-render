/** True only while `npm run build:cf` (Cloudflare static export). */
export function isCloudflarePagesBuild(): boolean {
  return process.env.TOUYA_CF_PAGES === "1";
}
