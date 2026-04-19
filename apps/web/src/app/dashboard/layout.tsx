import { Brain } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { UserMenu } from "./UserMenu";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/sign-in");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-md bg-brand/15 text-brand">
              <Brain className="size-3.5" />
            </div>
            <span className="text-sm font-semibold tracking-tight">
              Neureel
            </span>
          </Link>
          <UserMenu
            name={session.user.name}
            email={session.user.email}
            image={session.user.image ?? null}
          />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
