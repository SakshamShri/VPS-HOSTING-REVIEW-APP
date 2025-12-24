import { Link } from "react-router-dom";
import { LayoutDashboard, ListChecks, Users } from "lucide-react";

import { Button } from "../components/ui/button";
import { UserLayout } from "../layout/UserLayout";

export function UserHomePage() {
  return (
    <UserLayout>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="overflow-hidden rounded-2xl border bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 p-[1px] shadow-sm">
          <div className="flex flex-col gap-4 rounded-2xl bg-card/95 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
                Your poll hub
              </p>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                Welcome
              </h1>
              <p className="max-w-xl text-xs text-muted-foreground">
                This is your home space. From here you can explore polls, update your profile,
                or verify your identity. Start a quick invite-only poll or come back to see how
                your campaigns are doing.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <Button asChild size="sm" className="shadow-sm">
                <Link to="/polls/create">Create invite-only poll</Link>
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Takes less than a minute. No results dashboard yet – just clean voting.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Link
            to="/polls/create"
            className="group flex flex-col justify-between rounded-xl border bg-card p-4 text-xs shadow-sm transition hover:border-indigo-500 hover:shadow-md"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600">
                <ListChecks className="h-4 w-4" />
              </span>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Poll management
              </p>
            </div>
            <div className="mt-3 space-y-1">
              <p className="text-sm font-semibold text-foreground">Create a new poll</p>
              <p className="text-[11px] text-muted-foreground">
                Host a one-time invite-only poll and share unique links via WhatsApp.
              </p>
            </div>
            <span className="mt-3 text-[11px] font-medium text-indigo-600 group-hover:underline">
              Open wizard
            </span>
          </Link>

          <Link
            to="/user/feed"
            className="group flex flex-col justify-between rounded-xl border bg-card p-4 text-xs shadow-sm transition hover:border-emerald-500 hover:shadow-md"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
                <LayoutDashboard className="h-4 w-4" />
              </span>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Activity feed
              </p>
            </div>
            <div className="mt-3 space-y-1">
              <p className="text-sm font-semibold text-foreground">See what’s live</p>
              <p className="text-[11px] text-muted-foreground">
                In future, this will surface polls you’ve created or been invited to.
              </p>
            </div>
            <span className="mt-3 text-[11px] font-medium text-emerald-600 group-hover:underline">
              View feed
            </span>
          </Link>

          <Link
            to="/user/profile"
            className="group flex flex-col justify-between rounded-xl border bg-card p-4 text-xs shadow-sm transition hover:border-sky-500 hover:shadow-md"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-500/10 text-sky-600">
                <Users className="h-4 w-4" />
              </span>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Your profile
              </p>
            </div>
            <div className="mt-3 space-y-1">
              <p className="text-sm font-semibold text-foreground">Complete your details</p>
              <p className="text-[11px] text-muted-foreground">
                Keep your profile and address up to date so invites can reach the right you.
              </p>
            </div>
            <span className="mt-3 text-[11px] font-medium text-sky-600 group-hover:underline">
              Go to profile
            </span>
          </Link>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Upcoming
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              No scheduled polls yet
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              When you schedule a poll to start later, it will appear here with a countdown so
              you know when voting opens.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Invites
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              Join polls from your messages
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Any invite links you receive (for example on WhatsApp) will take you straight to a
              secure voting screen. This space will later show a history of polls you’ve joined.
            </p>
          </div>
        </section>
      </div>
    </UserLayout>
  );
}
