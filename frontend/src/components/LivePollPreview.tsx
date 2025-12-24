import type { PollConfig, PollTemplateType, ThemeTone, AccentStyle } from "../types/pollConfig.types";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface LivePollPreviewProps {
  config: PollConfig;
  rules?: any;
  permissions?: any;
}

function getThemeClasses(theme: ThemeTone, accent: AccentStyle) {
  const baseMap: Record<ThemeTone, { header: string; pill: string; button: string }> = {
    emerald: {
      header: "bg-emerald-600 text-emerald-50",
      pill: "bg-emerald-50 text-emerald-700 border-emerald-100",
      button: "bg-emerald-600 hover:bg-emerald-700 text-white",
    },
    indigo: {
      header: "bg-indigo-600 text-indigo-50",
      pill: "bg-indigo-50 text-indigo-700 border-indigo-100",
      button: "bg-indigo-600 hover:bg-indigo-700 text-white",
    },
    amber: {
      header: "bg-amber-500 text-amber-950",
      pill: "bg-amber-50 text-amber-700 border-amber-100",
      button: "bg-amber-500 hover:bg-amber-600 text-amber-950",
    },
    rose: {
      header: "bg-rose-500 text-rose-50",
      pill: "bg-rose-50 text-rose-700 border-rose-100",
      button: "bg-rose-500 hover:bg-rose-600 text-white",
    },
  };

  const base = baseMap[theme];

  if (accent === "bold") {
    return {
      header: `${base.header} shadow-sm`,
      pill: `${base.pill} font-semibold`,
      button: `${base.button} shadow-md`,
    };
  }

  return base;
}

function renderTemplatePreview(template: PollTemplateType) {
  switch (template) {
    case "yes-no-cards":
      return (
        <div className="grid grid-cols-2 gap-2">
          <button className="rounded-xl border bg-background px-3 py-3 text-sm font-medium shadow-sm">
            Yes
          </button>
          <button className="rounded-xl border bg-background px-3 py-3 text-sm font-medium shadow-sm">
            No
          </button>
        </div>
      );
    case "rating-bar":
      return (
        <div className="space-y-2">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Not good</span>
            <span>Excellent</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: 10 }).map((_, idx) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={idx}
                className="h-2 flex-1 rounded-full bg-muted"
              />
            ))}
          </div>
        </div>
      );
    case "swipe-deck":
      return (
        <div className="relative h-32">
          <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-2xl border border-dashed border-muted" />
          <div className="absolute inset-0 rounded-2xl border bg-background px-4 py-3 shadow-sm">
            <p className="text-xs font-medium">Swipe card</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Cards advance as the participant swipes left or right.
            </p>
          </div>
        </div>
      );
    case "point-allocation":
      return (
        <div className="space-y-3 text-xs">
          {["Option A", "Option B", "Option C"].map((label) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-xl border bg-background px-3 py-2"
            >
              <span>{label}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                0 pts
              </span>
            </div>
          ))}
        </div>
      );
    case "media-compare":
      return (
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="space-y-1 rounded-xl border bg-background p-2">
            <div className="h-16 rounded-md bg-muted" />
            <p className="font-medium">Variant A</p>
          </div>
          <div className="space-y-1 rounded-xl border bg-background p-2">
            <div className="h-16 rounded-md bg-muted" />
            <p className="font-medium">Variant B</p>
          </div>
        </div>
      );
    case "standard-list":
    default:
      return (
        <div className="space-y-2 text-sm">
          {["Strongly agree", "Agree", "Neutral", "Disagree"].map((option) => (
            <div
              key={option}
              className="flex items-center justify-between rounded-xl border bg-background px-3 py-2"
            >
              <span>{option}</span>
              <span className="h-3 w-3 rounded-full border border-muted" />
            </div>
          ))}
        </div>
      );
  }
}

export function LivePollPreview({ config, rules, permissions }: LivePollPreviewProps) {
  const theme = getThemeClasses(config.themeTone, config.accentStyle);

  const visibility: string = (permissions?.visibility as string) || "PUBLIC";
  const inviteOnly: boolean = permissions?.inviteOnly === true;
  const maxVotesPerUser: number | undefined = rules?.votingBehavior?.maxVotesPerUser;
  const allowChange: boolean = rules?.votingBehavior?.allowChange === true;

  return (
    <div className="flex justify-center">
      <div className="relative inline-flex items-center justify-center rounded-[2.5rem] bg-gradient-to-b from-slate-900 to-slate-800 p-3 shadow-lg">
        {/* Top speaker / camera notch */}
        <div className="pointer-events-none absolute top-2 h-1.5 w-16 rounded-full bg-slate-700/80" />

        <Card className="relative w-[270px] h-[540px] rounded-[2rem] border border-slate-800 bg-background shadow-inner overflow-hidden">
          <CardContent className="flex h-full flex-col gap-3 p-3">
            <div
              className={`flex items-center justify-between rounded-2xl px-3 py-2 text-xs ${theme.header}`}
            >
              <span className="font-semibold tracking-tight">Polls Engine</span>
              <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px]">
                Preview
              </span>
            </div>

            <div className="space-y-1 px-1 pt-1">
              <p className="text-[11px] font-medium text-muted-foreground">Previewing</p>
              <p className="text-sm font-semibold leading-snug text-foreground line-clamp-2">
                {config.title}
              </p>
              {config.description && (
                <p className="text-[11px] text-muted-foreground line-clamp-3">
                  {config.description}
                </p>
              )}
            </div>

            <div className="flex-1 space-y-2 overflow-hidden px-1 pt-1">
              {renderTemplatePreview(config.template)}

              <div className="mt-2 space-y-1 rounded-xl bg-muted/20 px-2 py-1.5 text-[10px] text-muted-foreground">
                <p className="font-semibold uppercase tracking-wide text-[10px]">
                  Behaviour & permissions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-background/70 px-2 py-0.5">
                    Visibility: {visibility === "PUBLIC" ? "Public" : visibility}
                  </span>
                  {inviteOnly && (
                    <span className="rounded-full bg-background/70 px-2 py-0.5">
                      Invite-only
                    </span>
                  )}
                  {typeof maxVotesPerUser === "number" && maxVotesPerUser > 0 && (
                    <span className="rounded-full bg-background/70 px-2 py-0.5">
                      Max votes: {maxVotesPerUser} per user
                    </span>
                  )}
                  {allowChange && (
                    <span className="rounded-full bg-background/70 px-2 py-0.5">
                      Voters can change response
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-1 pt-1">
              <Button size="sm" className={`h-7 rounded-full px-4 text-xs ${theme.button}`}>
                Submit response
              </Button>
              <Badge
                variant="outline"
                className={`border text-[10px] font-medium ${theme.pill}`}
              >
                Draft config
              </Badge>
            </div>

            <p className="px-1 pb-1 text-[10px] text-muted-foreground">
              Mobile-style preview only. No real responses are collected here.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
