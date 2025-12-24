import type { FC } from "react";

interface ContentRules {
  minOptions?: number;
  maxOptions?: number;
}

interface PollRules {
  contentRules?: ContentRules | null;
  votingBehavior?: any;
  resultsRules?: any;
}

export interface VoteRendererProps {
  templateType: string;
  rules: PollRules | null;
  disabled: boolean;
  value: any;
  onChange: (value: any) => void;
}

import { YesNoRenderer } from "./renderers/YesNoRenderer";
import { SingleChoiceRenderer } from "./renderers/SingleChoiceRenderer";
import { MultipleChoiceRenderer } from "./renderers/MultipleChoiceRenderer";
import { RatingRenderer } from "./renderers/RatingRenderer";

function buildStandardOptions(rules: PollRules | null): string[] {
  const min = rules?.contentRules?.minOptions ?? 2;
  const max = rules?.contentRules?.maxOptions ?? min;
  const count = Math.max(2, Math.min(max || min || 4, 6));
  return Array.from({ length: count }, (_, idx) => `Option ${idx + 1}`);
}

export const VoteRenderer: FC<VoteRendererProps> = ({
  templateType,
  rules,
  disabled,
  value,
  onChange,
}) => {
  const tpl = templateType?.toUpperCase();

  if (tpl === "YES_NO") {
    return <YesNoRenderer disabled={disabled} value={value} onChange={onChange} />;
  }

  if (tpl === "RATING") {
    const min = rules?.contentRules?.minOptions ?? 1;
    const max = rules?.contentRules?.maxOptions ?? 5;
    return (
      <RatingRenderer
        min={min}
        max={max}
        disabled={disabled}
        value={value}
        onChange={onChange}
      />
    );
  }

  if (tpl === "STANDARD_LIST") {
    const options = buildStandardOptions(rules ?? null);
    const maxSelections = rules?.contentRules?.maxOptions;
    const allowMultiple = maxSelections != null && maxSelections > 1;

    if (allowMultiple) {
      return (
        <MultipleChoiceRenderer
          options={options}
          maxSelections={maxSelections}
          disabled={disabled}
          value={value}
          onChange={onChange}
        />
      );
    }

    return (
      <SingleChoiceRenderer
        options={options}
        disabled={disabled}
        value={value}
        onChange={onChange}
      />
    );
  }

  return (
    <div className="rounded-md border border-dashed border-red-500/40 bg-red-500/5 p-3 text-[11px] text-red-500">
      Unsupported poll type for voting UI. Please contact the administrator.
    </div>
  );
};
