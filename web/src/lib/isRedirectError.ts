// next/navigation doesn't publicly export a stable `isRedirectError` in this
// version (only an internal `next/dist/client/components/redirect-error`
// path), so this checks the documented, stable signal directly: a
// Server Action that calls redirect() throws an error whose `digest`
// starts with "NEXT_REDIRECT". Calling such an action as a plain
// `await serverAction()` from client code (not through a <form action>)
// still throws that error to the caller -- redirect() *is* the success
// path, so a bare `.catch(() => toast.error(...))` shows a false failure
// toast on every successful redirect-on-success action (e.g. deleteBoard).
export function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}
