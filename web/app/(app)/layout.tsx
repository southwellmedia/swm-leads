import Link from "next/link";
import { Nav } from "@/components/nav";
import { signOut } from "@/app/actions";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header
        className="sticky top-0 z-20 border-b backdrop-blur"
        style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--bg) 85%, transparent)" }}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Leadscout
          </Link>
          <Nav />
          <form action={signOut} className="ml-auto">
            <button className="text-sm" style={{ color: "var(--muted)" }}>
              Sign out
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
