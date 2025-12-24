import type { FC } from "react";

interface SingleChoiceRendererProps {
  options: string[];
  disabled: boolean;
  value: any;
  onChange: (value: any) => void;
}

export const SingleChoiceRenderer: FC<SingleChoiceRendererProps> = ({
  options,
  disabled,
  value,
  onChange,
}) => {
  const selected: string | undefined = Array.isArray(value?.selectedOptions)
    ? value.selectedOptions[0]
    : undefined;

  return (
    <div className="space-y-2 text-xs">
      {options.map((opt) => {
        const active = selected === opt;
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange({ selectedOptions: [opt] })}
            className="flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors"
            style={{
              backgroundColor: active ? "var(--accent)" : "transparent",
              borderColor: active ? "var(--primary)" : "var(--accent)",
              color: "var(--text)",
            }}
          >
            <span>{opt}</span>
            <span
              className="h-3 w-3 rounded-full border"
              style={{ borderColor: active ? "var(--primary)" : "var(--accent)" }}
            />
          </button>
        );
      })}
    </div>
  );
};
