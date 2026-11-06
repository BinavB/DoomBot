"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";

interface Account {
  name: string;
  email: string;
}

export function UserMenu() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json() as Promise<{ user: Account | null }>)
      .then((data) => setAccount(data.user))
      .catch(() => setAccount(null));
  }, []);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (!account) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 md:border-t md:border-line md:pt-4">
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-raised text-sm font-semibold text-doom"
      >
        {account.name.charAt(0).toUpperCase()}
      </span>
      <span className="hidden min-w-0 flex-1 flex-col md:flex">
        <span className="truncate text-sm font-medium">{account.name}</span>
        <span className="truncate text-xs text-muted">{account.email}</span>
      </span>
      <button
        type="button"
        onClick={() => void signOut()}
        aria-label="Sign out"
        title="Sign out"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-danger"
      >
        <Icon name="logout" size={20} />
      </button>
    </div>
  );
}
