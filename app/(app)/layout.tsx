import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <AppShell
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        branch: session.user.branch,
        batchYear: session.user.batchYear,
      }}
    >
      {children}
    </AppShell>
  );
}
