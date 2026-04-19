"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function UserMenu({
  name,
  email,
  image,
}: {
  name: string;
  email: string;
  image: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const initials = name
    .split(" ")
    .map((s) => s.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-border bg-card/60 py-1 pl-1 pr-3 text-xs text-muted-foreground hover:bg-card hover:text-foreground"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={name}
            className="size-6 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
            {initials}
          </span>
        )}
        <span className="hidden sm:inline">{name}</span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            aria-orientation="vertical"
            className="absolute right-0 z-20 mt-2 w-56 rounded-md border border-border bg-popover p-2 shadow-lg"
          >
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
            <div className="my-1 h-px bg-border" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={handleSignOut}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
