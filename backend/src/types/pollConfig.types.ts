import type { PollConfigStatus, PollUiTemplate } from "@prisma/client";

export type PollConfigId = bigint;

export interface PollTheme {
  primaryColor: string;
  accentColor: string;
}

export interface PollContentRules {
  minOptions?: number;
  maxOptions?: number;
}

export interface PollVotingBehaviorRules {
  allowMultipleVotes?: boolean;
  allowAbstain?: boolean;
}

export interface PollResultsRules {
  showResults?: boolean;
  showWhileOpen?: boolean;
}

export interface PollPermissions {
  visibility?: "PUBLIC" | "INTERNAL" | "PRIVATE";
  inviteOnly?: boolean;
  adminCurated?: boolean;
}

export interface PollConfigCreateDTO {
  name: string;
  slug: string;
  status: PollConfigStatus;
  category_id: PollConfigId;
  ui_template: PollUiTemplate;
  theme: PollTheme;
  rules: {
    contentRules?: PollContentRules;
    votingBehavior?: PollVotingBehaviorRules;
    resultsRules?: PollResultsRules;
  };
  permissions: PollPermissions;
  version: number;
}

export type PollConfigUpdateDTO = Partial<
  Omit<PollConfigCreateDTO, "slug" | "category_id"> & {
    category_id?: PollConfigId | null;
  }
>;
