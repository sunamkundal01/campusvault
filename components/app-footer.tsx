import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function AppFooter() {
  return (
    <footer className="border-t bg-card/30">
      <div className="flex flex-col gap-3 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-8">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded bg-gradient-to-br from-primary to-blue-600 text-primary-foreground text-[10px] font-bold">
            C
          </span>
          <span>
            <span className="font-semibold text-foreground">CampusVault</span> · Built for NIT Srinagar students.{" "}
            <span className="hidden sm:inline">
              Not affiliated with the institute administration.
            </span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Watermarked &amp; audited
          </span>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <span className="hidden text-muted-foreground/60 sm:inline">
            © {new Date().getFullYear()} CampusVault
          </span>
        </div>
      </div>
    </footer>
  );
}
