"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Building2, Compass, MessageSquare, Search, Upload, FileBox, ShieldCheck, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/(app)/actions";
import { AppFooter } from "@/components/app-footer";

const nav = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/interviews", label: "Interview experiences", icon: MessageSquare },
  { href: "/search", label: "Search", icon: Search },
  { href: "/contribute", label: "Contribute", icon: Upload },
  { href: "/my-uploads", label: "My uploads", icon: FileBox },
];

export function AppShell({
  user,
  children,
}: {
  user: { name?: string | null; email?: string | null; role: "student" | "admin"; branch?: string | null; batchYear?: number | null };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <div className="grid min-h-screen md:grid-cols-[240px_1fr]">
      <aside className="hidden border-r bg-card/40 md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b px-5">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-primary to-blue-600 text-primary-foreground font-bold shadow-md shadow-primary/20">C</div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">CampusVault</div>
            <div className="text-xs text-muted-foreground">NIT Srinagar</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {nav.map((n) => {
            const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                  active
                    ? "bg-gradient-to-r from-primary/20 to-primary/0 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary" />
                )}
                <n.icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    active ? "text-primary" : "group-hover:text-foreground"
                  )}
                />
                {n.label}
              </Link>
            );
          })}
          {user.role === "admin" && (
            <Link
              href="/admin"
              className={cn(
                "group relative mt-4 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                pathname.startsWith("/admin")
                  ? "bg-gradient-to-r from-emerald-500/20 to-emerald-500/0 text-emerald-400 font-medium"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              )}
            >
              {pathname.startsWith("/admin") && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-emerald-500" />
              )}
              <ShieldCheck className="h-4 w-4" /> Admin
            </Link>
          )}
        </nav>
        <div className="border-t p-3">
          <div className="rounded-md border bg-background/40 p-3">
            <div className="truncate text-xs text-muted-foreground">{user.email}</div>
            <div className="mt-1 text-sm font-medium truncate">{user.name ?? "Student"}</div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              {user.branch ? <span className="rounded bg-muted px-1.5 py-0.5 uppercase">{user.branch}</span> : null}
              {user.batchYear ? <span>Batch {user.batchYear}</span> : null}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <form action={signOutAction}>
                <Button size="sm" variant="ghost" type="submit">
                  <LogOut className="h-4 w-4" /> Sign out
                </Button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded bg-gradient-to-br from-primary to-blue-600 text-primary-foreground text-xs font-bold">C</div>
            <span className="text-sm font-semibold">CampusVault</span>
          </div>
          <form action={signOutAction}>
            <Button size="icon" variant="ghost" type="submit" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </header>
        <div className="flex-1 p-4 md:p-8">{children}</div>
        <AppFooter />
      </main>
    </div>
  );
}
