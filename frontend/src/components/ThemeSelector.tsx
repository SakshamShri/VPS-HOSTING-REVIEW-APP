import type { AccentStyle, ThemeTone } from "../types/pollConfig.types";
import { Label } from "./ui/label";
import { Button } from "./ui/button";

interface ThemeSelectorProps {
  themeTone: ThemeTone;
  accentStyle: AccentStyle;
  onThemeToneChange: (tone: ThemeTone) => void;
  onAccentStyleChange: (accent: AccentStyle) => void;
}

const toneOptions: { id: ThemeTone; label: string; swatchClass: string }[] = [
  { id: "emerald", label: "Emerald", swatchClass: "bg-emerald-500" },
  { id: "indigo", label: "Indigo", swatchClass: "bg-indigo-500" },
  { id: "amber", label: "Amber", swatchClass: "bg-amber-500" },
  { id: "rose", label: "Rose", swatchClass: "bg-rose-500" },
];

const accentOptions: { id: AccentStyle; label: string; description: string }[] = [
  {
    id: "soft",
    label: "Soft",
    description: "Subtle chrome that blends into the product shell.",
  },
  {
    id: "bold",
    label: "Bold",
    description: "High-contrast accents for important calls-to-action.",
  },
];

export function ThemeSelector({
  themeTone,
  accentStyle,
  onThemeToneChange,
  onAccentStyleChange,
}: ThemeSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Theme color
        </Label>
        <div className="flex flex-wrap gap-2">
          {toneOptions.map((tone) => (
            <button
              key={tone.id}
              type="button"
              onClick={() => onThemeToneChange(tone.id)}
              className="group flex items-center gap-2 rounded-md border border-transparent bg-muted/40 px-2.5 py-1.5 text-xs hover:border-muted-foreground/40"
            >
              <span
                className={`h-4 w-4 rounded-full border border-white/60 shadow-sm ${tone.swatchClass}`}
              />
              <span className="text-xs font-medium text-foreground group-hover:text-foreground">
                {tone.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Accent style
        </Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {accentOptions.map((accent) => {
            const isActive = accent.id === accentStyle;
            return (
              <Button
                key={accent.id}
                type="button"
                variant={isActive ? "default" : "outline"}
                size="sm"
                className="h-auto justify-start gap-2 py-2 text-left"
                onClick={() => onAccentStyleChange(accent.id)}
              >
                <span className="text-xs font-semibold">{accent.label}</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  {accent.description}
                </span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
