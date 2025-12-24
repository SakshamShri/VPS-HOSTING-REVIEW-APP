export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-center text-sm text-muted-foreground">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
        404
      </p>
      <h1 className="mb-2 text-base font-semibold tracking-tight text-foreground">
        Page not found
      </h1>
      <p className="max-w-sm text-xs text-muted-foreground">
        The page you are looking for does not exist. Check the URL or return to the
        dashboard.
      </p>
    </div>
  );
}
