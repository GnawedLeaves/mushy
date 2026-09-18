import Link from "next/link";
import { signUpWithPassword } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GradientBackground } from "@/components/fx/GradientBackground";
import { TextPressure } from "@/components/fx/TextPressure";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden p-4">
      <GradientBackground />
      <div className="h-[110px] w-[280px]">
        <TextPressure text="mushy" textColor="#111111" minFontSize={24} italic={false} />
      </div>
      <div className="w-full max-w-sm space-y-6 rounded-2xl bg-background/70 p-6 backdrop-blur-md">
        <p className="text-center text-sm text-muted-foreground">Save tasteful designs. Build your eye.</p>

        {params.error && (
          <p className="text-sm text-destructive text-center">{params.error}</p>
        )}

        <form action={signUpWithPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" />
          </div>
          <Button type="submit" className="w-full">
            Sign up
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="underline underline-offset-4 hover:text-foreground">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
