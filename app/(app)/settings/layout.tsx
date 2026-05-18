"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Categories", href: "/settings/categories" },
  { label: "Payment Methods", href: "/settings/payment-methods" },
  { label: "Profile", href: "/settings/profile" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your preferences</p>
      </div>
      <nav className="flex gap-1 rounded-lg bg-muted/50 border p-1 w-fit">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-md px-3.5 py-2 text-sm font-medium transition-all duration-200",
              pathname === tab.href
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
