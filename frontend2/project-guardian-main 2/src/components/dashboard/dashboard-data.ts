export type RiskLevel = "critical" | "high" | "medium" | "low";
export type PaymentStatus = "paid" | "partial" | "pending" | "blocked";

export interface Project {
  id: string;
  name: string;
  description: string;
  delay: number;
  payment: PaymentStatus;
  resources: number;
  score: number;
  risk: RiskLevel;
}

export interface NewProjectInput {
  name: string;
  description: string;
  delay: number;
  payment: PaymentStatus;
  resources: number;
}

const paymentPenalty: Record<PaymentStatus, number> = {
  paid: 5,
  partial: 18,
  pending: 28,
  blocked: 40,
};

const riskOrder: Record<RiskLevel, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function calculateProjectRisk(input: NewProjectInput) {
  const normalizedDelay = clamp(input.delay, 0, 100);
  const normalizedResources = clamp(input.resources, 1, 10);
  const resourcePenalty = (10 - normalizedResources) * 5;
  const score = clamp(Math.round(normalizedDelay * 0.55 + paymentPenalty[input.payment] + resourcePenalty), 0, 100);

  const risk: RiskLevel =
    score >= 80 ? "critical" :
    score >= 60 ? "high" :
    score >= 35 ? "medium" : "low";

  return { score, risk };
}

export function createProject(id: string, input: NewProjectInput): Project {
  const { score, risk } = calculateProjectRisk(input);
  return {
    id,
    ...input,
    score,
    risk,
  };
}

export const initialProjects: Project[] = [
  createProject("PRJ-001", { name: "Neural Engine v3", description: "AI model training platform for deep learning workloads.", delay: 72, payment: "blocked", resources: 3 }),
  createProject("PRJ-002", { name: "Data Pipeline Refactor", description: "ETL pipeline modernisation for real-time analytics.", delay: 48, payment: "pending", resources: 5 }),
  createProject("PRJ-003", { name: "Auth Service Migration", description: "OAuth 2.0 migration for the enterprise SSO system.", delay: 26, payment: "partial", resources: 7 }),
  createProject("PRJ-004", { name: "ML Model Optimization", description: "Reducing inference latency for production ML models.", delay: 10, payment: "paid", resources: 9 }),
  createProject("PRJ-005", { name: "Cloud Infra Scaling", description: "Kubernetes cluster auto-scaling for peak load handling.", delay: 58, payment: "pending", resources: 4 }),
  createProject("PRJ-006", { name: "API Gateway Redesign", description: "Redesigning the API gateway for higher throughput.", delay: 33, payment: "paid", resources: 6 }),
];

export function getHighestRiskProject(projects: Project[]) {
  return [...projects].sort((a, b) => {
    const rankGap = riskOrder[b.risk] - riskOrder[a.risk];
    if (rankGap !== 0) return rankGap;
    return b.score - a.score;
  })[0];
}

export function getProjectChartData(projects: Project[]) {
  return projects.map((project) => ({
    id: project.id,
    name: project.name.length > 14 ? `${project.name.slice(0, 14)}…` : project.name,
    fullName: project.name,
    score: project.score,
    risk: project.risk,
  }));
}
