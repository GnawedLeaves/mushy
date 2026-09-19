"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSectionPath } from "@/lib/useSectionPath";

export function NavLink({
  href,
  exact = false,
  className,
  children,
  ...rest
}: {
  href: string;
  exact?: boolean;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentProps<typeof Link>, "href" | "className" | "children">) {
  const pathname = useSectionPath();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "transition-colors",
        active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
        className
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}
