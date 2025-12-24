import { useEffect, useMemo, useState } from "react";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  approveClaimTicketAdmin,
  approveRequestTicketAdmin,
  fetchClaimTicketsAdmin,
  fetchRequestTicketsAdmin,
  rejectClaimTicketAdmin,
  rejectRequestTicketAdmin,
  type ProfileClaimTicket,
  type ProfileRequestTicket,
  type TicketStatus,
} from "../api/profileSystem.api";

type TicketTab = "claims" | "requests";

const ALL_STATUSES: TicketStatus[] = ["PENDING", "APPROVED", "REJECTED"];

export function TicketCenterPage() {
  const [tab, setTab] = useState<TicketTab>("claims");
  const [claimTickets, setClaimTickets] = useState<ProfileClaimTicket[]>([]);
  const [requestTickets, setRequestTickets] = useState<ProfileRequestTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilters, setStatusFilters] = useState<Record<TicketStatus, boolean>>({
    PENDING: true,
    APPROVED: false,
    REJECTED: false,
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [claims, requests] = await Promise.all([
          fetchClaimTicketsAdmin(),
          fetchRequestTicketsAdmin(),
        ]);
        setClaimTickets(claims);
        setRequestTickets(requests);
      } catch (err) {
        console.error(err);
        setError((err as Error).message || "Failed to load tickets");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const toggleStatus = (status: TicketStatus) => {
    setStatusFilters((prev) => ({ ...prev, [status]: !prev[status] }));
  };

  const filteredClaimTickets = useMemo(
    () => claimTickets.filter((t) => statusFilters[t.status]),
    [claimTickets, statusFilters]
  );

  const filteredRequestTickets = useMemo(
    () => requestTickets.filter((t) => statusFilters[t.status]),
    [requestTickets, statusFilters]
  );

  const handleApproveClaim = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await approveClaimTicketAdmin(id);
      const claims = await fetchClaimTicketsAdmin();
      setClaimTickets(claims);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Failed to approve claim");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectClaim = async (id: string) => {
    const reason = window.prompt("Optional: Add a reason for rejection", "Rejected") || undefined;
    try {
      setLoading(true);
      setError(null);
      await rejectClaimTicketAdmin(id, reason);
      const claims = await fetchClaimTicketsAdmin();
      setClaimTickets(claims);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Failed to reject claim");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await approveRequestTicketAdmin(id);
      const requests = await fetchRequestTicketsAdmin();
      setRequestTickets(requests);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Failed to approve request");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async (id: string) => {
    const reason = window.prompt("Optional: Add a reason for rejection", "Rejected") || undefined;
    try {
      setLoading(true);
      setError(null);
      await rejectRequestTicketAdmin(id, reason);
      const requests = await fetchRequestTicketsAdmin();
      setRequestTickets(requests);
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Failed to reject request");
    } finally {
      setLoading(false);
    }
  };

  const activeTickets = tab === "claims" ? filteredClaimTickets : filteredRequestTickets;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight text-foreground">Ticket Center</h2>
          <p className="text-xs text-muted-foreground">
            Review profile claims and new profile requests. Use the filters to focus on specific
            statuses.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setError(null);
            void (async () => {
              try {
                setLoading(true);
                const [claims, requests] = await Promise.all([
                  fetchClaimTicketsAdmin(),
                  fetchRequestTicketsAdmin(),
                ]);
                setClaimTickets(claims);
                setRequestTickets(requests);
              } catch (err) {
                console.error(err);
                setError((err as Error).message || "Failed to refresh tickets");
              } finally {
                setLoading(false);
              }
            })();
          }}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <Card className="border-none bg-card/95 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
              Tickets
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="inline-flex rounded-md border bg-muted p-1 text-xs">
                <button
                  type="button"
                  className={`flex-1 rounded px-2 py-1 text-xs font-medium ${
                    tab === "claims" ? "bg-background text-foreground shadow" : "text-muted-foreground"
                  }`}
                  onClick={() => setTab("claims")}
                >
                  Claims
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded px-2 py-1 text-xs font-medium ${
                    tab === "requests"
                      ? "bg-background text-foreground shadow"
                      : "text-muted-foreground"
                  }`}
                  onClick={() => setTab("requests")}
                >
                  Requests
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {ALL_STATUSES.map((status) => {
                  const active = statusFilters[status];
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => toggleStatus(status)}
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        active
                          ? "border-primary bg-primary/10 text-primary-foreground"
                          : "border-border bg-background text-muted-foreground"
                      }`}
                    >
                      {status.charAt(0) + status.slice(1).toLowerCase()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
          {loading && !activeTickets.length ? (
            <p className="text-xs text-muted-foreground">Loading tickets...</p>
          ) : activeTickets.length === 0 ? (
            <p className="text-xs text-muted-foreground">No tickets match the current filters.</p>
          ) : (
            <ScrollArea className="max-h-[420px] pr-2 text-xs">
              <div className="space-y-2">
                {activeTickets.map((ticket) => {
                  const isPending = ticket.status === "PENDING";
                  const statusColor =
                    ticket.status === "PENDING"
                      ? "text-amber-700 bg-amber-50 border-amber-200"
                      : ticket.status === "APPROVED"
                      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                      : "text-rose-700 bg-rose-50 border-rose-200";

                  const isClaim = tab === "claims";

                  return (
                    <div
                      key={ticket.id}
                      className="flex items-start justify-between gap-3 rounded-md border bg-background px-3 py-2"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-mono text-muted-foreground">
                            #{ticket.id}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusColor}`}
                          >
                            {ticket.status}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(ticket.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          {isClaim ? (
                            <p className="text-xs font-medium text-foreground">
                              {(
                                ticket as ProfileClaimTicket
                              ).profileName || "Unnamed profile"}
                            </p>
                          ) : (
                            <p className="text-xs font-medium text-foreground">
                              {(ticket as ProfileRequestTicket).requestedName}
                            </p>
                          )}
                          <p className="text-[11px] text-muted-foreground">
                            Category: {ticket.categoryName || "Unknown"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            User: {ticket.userMobile || ticket.userId}
                          </p>
                        </div>
                        {ticket.documents.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {ticket.documents.map((doc) => (
                              <a
                                key={doc.id}
                                href={doc.downloadUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/80"
                              >
                                {doc.fieldKey}: {doc.originalName}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {isPending && (
                          <>
                            <Button
                              type="button"
                              size="xs"
                              className="h-6 px-2 text-[11px]"
                              onClick={() =>
                                isClaim
                                  ? void handleApproveClaim(ticket.id)
                                  : void handleApproveRequest(ticket.id)
                              }
                            >
                              Approve
                            </Button>
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              className="h-6 px-2 text-[11px]"
                              onClick={() =>
                                isClaim
                                  ? void handleRejectClaim(ticket.id)
                                  : void handleRejectRequest(ticket.id)
                              }
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
