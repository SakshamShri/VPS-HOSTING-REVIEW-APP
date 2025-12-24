export type PollConfigSection =
  | "ui-template"
  | "basic-info"
  | "content-rules"
  | "voting-behavior"
  | "results-psi"
  | "permissions";

export type PollTemplateType =
  | "standard-list"
  | "yes-no-cards"
  | "rating-bar"
  | "swipe-deck"
  | "point-allocation"
  | "media-compare";

export type PollConfigStatus = "DRAFT" | "ACTIVE" | "DISABLED";

export type ThemeTone = "emerald" | "indigo" | "amber" | "rose";
export type AccentStyle = "soft" | "bold";

export interface PollConfig {
  id: string;
  name: string;
  typeId: string;
  status: PollConfigStatus;
  template: PollTemplateType;
  themeTone: ThemeTone;
  accentStyle: AccentStyle;
  title: string;
  description?: string;
}
