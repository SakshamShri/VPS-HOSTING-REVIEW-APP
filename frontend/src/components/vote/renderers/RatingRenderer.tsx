import type { FC } from "react";

interface RatingRendererProps {
  min: number;
  max: number;
  disabled: boolean;
  value: any;
  onChange: (value: any) => void;
}

export const RatingRenderer: FC<RatingRendererProps> = ({ min, max, disabled, value, onChange }) => {
  const current = typeof value?.value === "number" ? value.value : 0;

  const items = [];
  for (let v = min; v <= max; v++) {
    items.push(v);
  }

  return (
    <div className="space-y-2 text-xs">
      <div className="flex gap-1">
        {items.map((v) => {
          const active = current === v;
          return (
            <button
              key={v}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onChange({ value: v })}
              className="flex h-7 w-7 items-center justify-center rounded-full border text-[11px] transition-colors"
              style={{
                backgroundColor: active ? "var(--accent)" : "transparent",
                borderColor: active ? "var(--primary)" : "var(--accent)",
                color: "var(--text)",
              }}
            >
              {v}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-400">
        Tap a number between {min} and {max} to vote.
      </p>
    </div>
  );
};
