import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-8 text-center">
          <h1 className="text-2xl font-semibold">Not authorized</h1>
          <p className="text-sm text-muted-foreground">
            You don&apos;t have access to this page. If you think this is a mistake, contact an admin.
          </p>
          <Button asChild>
            <Link href="/">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
