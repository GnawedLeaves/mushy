import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/fx/AppShell";
import { UserSearch } from "@/components/search/UserSearch";
import { NavLink } from "@/components/nav/NavLink";
import { NotificationBell } from "@/components/notifications/NotificationBell";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let username: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    username = profile?.username ?? null;
  }

  const nav = (
    <>
      <nav className="flex items-center gap-5 text-sm">
        <Link href="/" className="font-semibold tracking-tight">
          mushy six
        </Link>
        <NavLink href="/" exact>
          Gallery
        </NavLink>
        <NavLink href="/discover">Discover</NavLink>
        <NavLink href="/boards">Boards</NavLink>
      </nav>
      <div className="flex items-center gap-3 text-sm">
        <div className="w-48">
          <UserSearch />
        </div>
        <NavLink href="/help" aria-label="Help" title="Help" className="flex items-center">
          <HelpCircle className="h-4.5 w-4.5" />
        </NavLink>
        {user ? (
          <>
            <NotificationBell />
            {username && (
              <NavLink href={`/u/${username}`} exact>
                @{username}
              </NavLink>
            )}
            <NavLink href="/settings">Settings</NavLink>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                Log out
              </Button>
            </form>
          </>
        ) : (
          <Link href="/login" className="text-muted-foreground hover:text-foreground">
            Log in
          </Link>
        )}
      </div>
    </>
  );

  return <AppShell nav={nav}>{children}</AppShell>;
}
