"use client";

import { useFormStatus } from "react-dom";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

// Reads the nearest parent <form>'s pending state -- works with a plain
// `<form action={someServerAction}>` with no client-side wiring needed on
// the caller's side. Must be rendered as a descendant of that <form>.
export function SubmitButton({
  children,
  pendingText,
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { pendingText?: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      variant={variant}
      size={size}
      className={cn(className)}
      {...props}
    >
      {pending ? pendingText ?? "Please wait..." : children}
    </Button>
  );
}
