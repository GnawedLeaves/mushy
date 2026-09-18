import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/fx/AppShell";
import { UserSearch } from "@/components/search/UserSearch";

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
        <Link href="/" className="text-muted-foreground hover:text-foreground">
          Gallery
        </Link>
        <Link href="/discover" className="text-muted-foreground hover:text-foreground">
          Discover
        </Link>
        <Link href="/boards" className="text-muted-foreground hover:text-foreground">
          Boards
        </Link>
      </nav>
      <div className="flex items-center gap-3 text-sm">
        <div className="w-48">
          <UserSearch />
        </div>
        <Link href="/help" className="text-muted-foreground hover:text-foreground">
          Help
        </Link>
        {user ? (
          <>
            {username && (
              <Link href={`/u/${username}`} className="text-muted-foreground hover:text-foreground">
                @{username}
              </Link>
            )}
            <Link href="/settings" className="text-muted-foreground hover:text-foreground">
              Settings
            </Link>
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
