import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/fx/AppShell";

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
          mushy
        </Link>
        <Link href="/" className="text-muted-foreground hover:text-foreground">
          Gallery
        </Link>
        <Link href="/boards" className="text-muted-foreground hover:text-foreground">
          Boards
        </Link>
      </nav>
      <div className="flex items-center gap-3 text-sm">
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
      </div>
    </>
  );

  return <AppShell nav={nav}>{children}</AppShell>;
}
