import type { PollConfig } from "../types/pollConfig.types";

export const defaultPollConfig: PollConfig = {
  id: "cfg-001",
  name: "Standard Opinion Poll",
  typeId: "DNA-STD-001",
  status: "DRAFT",
  template: "standard-list",
  themeTone: "emerald",
  accentStyle: "soft",
  title: "How do you feel about the new policy?",
  description: "Your response helps us tune future experiments.",
};

export const savedPollBlueprints: PollConfig[] = [
  {
    id: "cfg-quick-pulse",
    name: "Quick Pulse (Yes / No)",
    typeId: "DNA-YN-QUICK",
    status: "DRAFT",
    template: "yes-no-cards",
    themeTone: "indigo",
    accentStyle: "bold",
    title: "Do you support this proposal?",
    description: "One-tap vote with strong contrast.",
  },
  {
    id: "cfg-nps-lite",
    name: "Satisfaction Rating Bar",
    typeId: "DNA-RT-001",
    status: "DRAFT",
    template: "rating-bar",
    themeTone: "amber",
    accentStyle: "soft",
    title: "Rate your recent experience.",
    description: "Simple 10 rating style.",
  },
  {
    id: "cfg-swipe-deck",
    name: "Swipe Feedback Deck",
    typeId: "DNA-SW-001",
    status: "DRAFT",
    template: "swipe-deck",
    themeTone: "rose",
    accentStyle: "bold",
    title: "Swipe to share your reaction.",
    description: "Sequential card stack optimized for mobile.",
  },
];
