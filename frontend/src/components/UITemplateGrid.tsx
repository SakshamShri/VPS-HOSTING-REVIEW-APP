import type { PollTemplateType } from "../types/pollConfig.types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface UITemplateGridProps {
  selected: PollTemplateType;
  onChange: (template: PollTemplateType) => void;
}

const templates: { id: PollTemplateType; title: string; description: string }[] = [
  {
    id: "standard-list",
    title: "Standard List",
    description: "Vertical list of options with radio-style selection.",
  },
  {
    id: "yes-no-cards",
    title: "Yes / No Cards",
    description: "Two-up card layout optimized for binary choices.",
  },
  {
    id: "rating-bar",
    title: "Rating Bar",
    description: "Horizontal bar for 10 or Likert-style scoring.",
  },
  {
    id: "swipe-deck",
    title: "Swipe Deck",
    description: "Stack of cards that advance with swipe gestures.",
  },
  {
    id: "point-allocation",
    title: "Point Allocation",
    description: "Distribute a fixed budget of points across options.",
  },
  {
    id: "media-compare",
    title: "Media Compare",
    description: "Side-by-side layout for image or video comparisons.",
  },
];

export function UITemplateGrid({ selected, onChange }: UITemplateGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((tpl) => {
        const isActive = tpl.id === selected;
        return (
          <button
            key={tpl.id}
            type="button"
            onClick={() => onChange(tpl.id)}
            className="text-left"
          >
            <Card
              className={`h-full border transition-colors ${
                isActive
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold tracking-tight">
                  {tpl.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{tpl.description}</p>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
