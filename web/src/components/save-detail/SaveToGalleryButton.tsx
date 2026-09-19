"use client";

import { useState, useTransition } from "react";
import { Check, FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { repinSave } from "@/lib/actions/discover";

export function SaveToGalleryButton({ saveId }: { saveId: string }) {
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await repinSave(saveId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setSaved(true);
        toast.success("Saved to your gallery.");
      }
    });
  }

  return (
    <Button variant="outline" size="sm" className="gap-1.5" disabled={pending || saved} onClick={handleClick}>
      {saved ? <Check className="h-4 w-4" /> : <FolderPlus className="h-4 w-4" />}
      {saved ? "Saved" : "Save to my gallery"}
    </Button>
  );
}
