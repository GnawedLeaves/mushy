"use client";

import { useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateToken, revokeToken } from "@/lib/actions/tokens";

interface TokenRow {
  id: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export function TokenManager({ initialTokens }: { initialTokens: TokenRow[] }) {
  const [tokens, setTokens] = useState(initialTokens);
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleGenerate() {
    setPending(true);
    try {
      const { token } = await generateToken("Browser Extension");
      setFreshToken(token);
      setTokens((prev) => [
        { id: crypto.randomUUID(), name: "Browser Extension", last_used_at: null, created_at: new Date().toISOString(), revoked_at: null },
        ...prev,
      ]);
    } catch {
      toast.error("Could not generate token.");
    }
    setPending(false);
  }

  function handleRevoke(id: string) {
    setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, revoked_at: new Date().toISOString() } : t)));
    revokeToken(id).catch(() => toast.error("Could not revoke token."));
  }

  function copyToken() {
    if (!freshToken) return;
    navigator.clipboard.writeText(freshToken);
    toast.success("Copied to clipboard.");
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Paste a token into the Mushy Six browser extension&apos;s options page so it can save on your behalf.
      </p>

      {freshToken && (
        <div className="space-y-2 rounded-lg border bg-muted p-4">
          <p className="text-sm font-medium">Copy this now -- it won&apos;t be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-background px-2 py-1.5 text-xs">{freshToken}</code>
            <Button size="icon" variant="outline" onClick={copyToken}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Button onClick={handleGenerate} disabled={pending} size="sm">
        {pending ? "Generating..." : "Generate new token"}
      </Button>

      <div className="divide-y rounded-lg border">
        {tokens.length === 0 && <p className="p-4 text-sm text-muted-foreground">No tokens yet.</p>}
        {tokens.map((token) => (
          <div key={token.id} className="flex items-center justify-between p-3 text-sm">
            <div>
              <p className="font-medium">{token.name}</p>
              <p className="text-xs text-muted-foreground">
                {token.revoked_at
                  ? "Revoked"
                  : token.last_used_at
                    ? `Last used ${new Date(token.last_used_at).toLocaleDateString()}`
                    : "Never used"}
              </p>
            </div>
            {!token.revoked_at && (
              <Button size="icon" variant="ghost" onClick={() => handleRevoke(token.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
