import type { CategoryId } from "./category.types";
import type { PollConfigId } from "./pollConfig.types";

export type PollId = bigint;

export type PollStatus = "DRAFT" | "PUBLISHED" | "CLOSED";

export interface PollCreateDTO {
  title: string;
  description?: string | null;
  poll_config_id: PollConfigId;
  category_id: CategoryId;
  status: PollStatus;
  start_at?: Date | null;
  end_at?: Date | null;
}

export type PollUpdateDTO = Partial<PollCreateDTO>;

export interface PollListItemDTO {
  id: PollId;
  title: string;
  status: PollStatus;
  category_id: CategoryId;
  poll_config_id: PollConfigId;
  category_path: string;
  poll_config_name: string;
  start_at: Date | null;
  end_at: Date | null;
}

export interface PollDetailDTO {
  id: PollId;
  title: string;
  description: string | null;
  status: PollStatus;
  category_id: CategoryId;
  poll_config_id: PollConfigId;
  category_path: string;
  poll_config_name: string;
  start_at: Date | null;
  end_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// Lightweight view for the public voting page, enriched with PollConfig theme
// information but without exposing admin-only configuration details.
export interface PollConfigThemeDTO {
  templateType: string;
  theme: {
    primaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
  };
  rules: unknown;
}

export interface PollDetailForVoteDTO {
  id: PollId;
  title: string;
  description: string | null;
  status: PollStatus;
  start_at: Date | null;
  end_at: Date | null;
  poll_config: PollConfigThemeDTO;
}

export interface PollFeedItemDTO {
	id: PollId;
	title: string;
	description: string | null;
	status: PollStatus;
	category_name: string;
	start_at: Date | null;
	end_at: Date | null;
}
