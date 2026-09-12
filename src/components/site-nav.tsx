import Link from "next/link";

const LINKS = [
  { href: "/diag", label: "診断" },
  { href: "/premium", label: "広告なし" },
  { href: "/policy", label: "約束" },
];

export function SiteNav() {
  return (
    <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-amber-100/55">
      {LINKS.map((link) => (
        <Link key={link.href} href={link.href} className="hover:text-amber-50">
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
