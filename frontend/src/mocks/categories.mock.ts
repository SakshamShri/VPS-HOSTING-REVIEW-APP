import type { CategoryNode } from "../types/category";

export const categoryTreeMock: CategoryNode[] = [
  {
    id: "engagement",
    name: "Engagement",
    type: "parent",
    status: "active",
    children: [
      {
        id: "nps",
        name: "Net Promoter Score",
        type: "child",
        status: "active",
      },
      {
        id: "csat",
        name: "Customer Satisfaction",
        type: "child",
        status: "active",
      },
      {
        id: "churn-risk",
        name: "Churn Risk",
        type: "child",
        status: "disabled",
      },
    ],
  },
  {
    id: "product-feedback",
    name: "Product Feedback",
    type: "parent",
    status: "active",
    children: [
      {
        id: "roadmap-input",
        name: "Roadmap Input",
        type: "child",
        status: "active",
      },
      {
        id: "feature-adoption",
        name: "Feature Adoption",
        type: "child",
        status: "active",
      },
      {
        id: "ux-issues",
        name: "UX Issues",
        type: "child",
        status: "disabled",
      },
    ],
  },
  {
    id: "compliance",
    name: "Compliance & Risk",
    type: "parent",
    status: "disabled",
    children: [
      {
        id: "policy-ack",
        name: "Policy Acknowledgements",
        type: "child",
        status: "disabled",
      },
      {
        id: "incident-postmortem",
        name: "Incident Postmortems",
        type: "child",
        status: "active",
      },
    ],
  },
  {
    id: "people",
    name: "People & Culture",
    type: "parent",
    status: "active",
    children: [
      {
        id: "engagement-pulse",
        name: "Engagement Pulse",
        type: "child",
        status: "active",
      },
      {
        id: "manager-feedback",
        name: "Manager Feedback",
        type: "child",
        status: "active",
      },
    ],
  },
];
