export type PollStatus = "DRAFT" | "PUBLISHED" | "CLOSED";

export interface PollListItem {
  id: string;
  title: string;
  status: PollStatus;
  categoryPath: string;
  pollConfigName: string;
  startAt?: string | null;
  endAt?: string | null;
}

export interface PollFormValues {
  title: string;
  description: string;
  categoryId: string;
  pollConfigId: string;
  startAt: string; // ISO string or "" for unset
  endAt: string;   // ISO string or "" for unset
  status: PollStatus;
}
