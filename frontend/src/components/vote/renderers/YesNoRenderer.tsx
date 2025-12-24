import type { FC } from "react";

interface YesNoRendererProps {
  disabled: boolean;
  value: any;
  onChange: (value: any) => void;
}

export const YesNoRenderer: FC<YesNoRendererProps> = ({ disabled, value, onChange }) => {
  const choice: "YES" | "NO" | undefined = value?.choice;

  const baseBtn =
    "flex-1 rounded-xl border px-3 py-2 text-xs font-medium transition-colors focus:outline-none";

  const yesActive = choice === "YES";
  const noActive = choice === "NO";

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onChange({ choice: "YES" })}
        className={baseBtn}
        style={{
          backgroundColor: yesActive ? "var(--accent)" : "transparent",
          borderColor: yesActive ? "var(--primary)" : "var(--accent)",
          color: yesActive ? "var(--primary)" : "var(--text)",
        }}
      >
        Yes
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onChange({ choice: "NO" })}
        className={baseBtn}
        style={{
          backgroundColor: noActive ? "var(--accent)" : "transparent",
          borderColor: noActive ? "var(--primary)" : "var(--accent)",
          color: noActive ? "var(--primary)" : "var(--text)",
        }}
      >
        No
      </button>
    </div>
  );
};
