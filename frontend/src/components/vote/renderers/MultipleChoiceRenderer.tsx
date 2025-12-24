import type { FC } from "react";

interface MultipleChoiceRendererProps {
  options: string[];
  maxSelections?: number;
  disabled: boolean;
  value: any;
  onChange: (value: any) => void;
}

export const MultipleChoiceRenderer: FC<MultipleChoiceRendererProps> = ({
  options,
  maxSelections,
  disabled,
  value,
  onChange,
}) => {
  const selected: string[] = Array.isArray(value?.selectedOptions) ? value.selectedOptions : [];

  const toggle = (opt: string) => {
    if (disabled) return;
    const isSelected = selected.includes(opt);
    let next: string[];
    if (isSelected) {
      next = selected.filter((v) => v !== opt);
    } else {
      next = [...selected, opt];
      if (maxSelections && next.length > maxSelections) {
        next = next.slice(0, maxSelections);
      }
    }
    onChange({ selectedOptions: next });
  };

  return (
    <div className="space-y-2 text-xs">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => toggle(opt)}
            className="flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors"
            style={{
              backgroundColor: active ? "var(--accent)" : "transparent",
              borderColor: active ? "var(--primary)" : "var(--accent)",
              color: "var(--text)",
            }}
          >
            <span>{opt}</span>
            <span
              className="flex h-3 w-3 items-center justify-center rounded-[3px] border"
              style={{
                borderColor: active ? "var(--primary)" : "var(--accent)",
                backgroundColor: active ? "var(--primary)" : "transparent",
              }}
            />
          </button>
        );
      })}
      {maxSelections && (
        <p className="pt-1 text-[10px] text-slate-400">
          You can select up to {maxSelections} option{maxSelections > 1 ? "s" : ""}.
        </p>
      )}
    </div>
  );
};
