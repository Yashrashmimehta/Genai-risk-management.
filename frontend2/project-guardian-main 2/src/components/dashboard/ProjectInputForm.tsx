import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { PlusCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calculateProjectRisk, type NewProjectInput, type PaymentStatus } from "@/components/dashboard/dashboard-data";

const paymentOptions: PaymentStatus[] = ["paid", "partial", "pending", "blocked"];

const projectSchema = z.object({
  name: z.string().trim().min(2, "Project name is required").max(80, "Use 80 characters or less"),
  description: z.string().trim().min(10, "Please describe the organisation (min 10 chars)").max(500, "Keep it under 500 characters"),
  delay: z.coerce.number().min(0, "Delay must be 0 or more").max(100, "Keep delay within 100"),
  payment: z.enum(["paid", "partial", "pending", "blocked"]),
  resources: z.coerce.number().int("Use a whole number").min(1, "Minimum 1").max(10, "Maximum 10"),
});

type FormState = {
  name: string;
  description: string;
  delay: string;
  payment: PaymentStatus;
  resources: string;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const initialState: FormState = {
  name: "",
  description: "",
  delay: "0",
  payment: "pending",
  resources: "5",
};

// Risk level display helpers
const RISK_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  critical: { label: "Critical", color: "text-red-400",   bg: "bg-red-500/10",    border: "border-red-500/30" },
  high:     { label: "High",     color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  medium:   { label: "Medium",   color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
  low:      { label: "Low",      color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/30" },
};

// Score factor breakdown helpers (mirrors backend logic)
const paymentPenaltyMap: Record<PaymentStatus, number> = {
  paid: 5, partial: 18, pending: 28, blocked: 40,
};
const paymentLabel: Record<PaymentStatus, string> = {
  paid:    "fully paid — minimal financial risk.",
  partial: "partially paid — some financial exposure present.",
  pending: "pending — elevated cash-flow risk.",
  blocked: "blocked — critical payment issue that may halt delivery.",
};

function buildFactors(project: NewProjectInput) {
  const delay    = Math.min(Math.max(project.delay, 0), 100);
  const res      = Math.min(Math.max(project.resources, 1), 10);
  const delayPts = Math.round(delay * 0.55);
  const payPts   = paymentPenaltyMap[project.payment];
  const resPts   = (10 - res) * 5;

  return [
    {
      label: "Schedule Delay",
      pts: delayPts,
      detail:
        delay > 5
          ? `${delay} days behind schedule — significantly increases delivery risk.`
          : `${delay} days — within acceptable limits.`,
      severity: delay > 20 ? "high" : delay > 5 ? "medium" : "low",
    },
    {
      label: "Payment Status",
      pts: payPts,
      detail: `${project.payment.charAt(0).toUpperCase() + project.payment.slice(1)} — ${paymentLabel[project.payment]}`,
      severity: project.payment === "blocked" ? "high" : project.payment === "pending" ? "medium" : "low",
    },
    {
      label: "Resource Availability",
      pts: resPts,
      detail:
        res < 3
          ? `Only ${res} team member(s) — resource shortage may cause burnout.`
          : `${res} team members — adequately staffed.`,
      severity: res < 3 ? "high" : res < 5 ? "medium" : "low",
    },
  ];
}

function buildMitigations(project: NewProjectInput, risk: string): string[] {
  const suggestions: string[] = [];
  const { delay, resources: res, name, description } = project;

  // Schedule suggestions
  if (delay > 30) {
    suggestions.push("Fast-track critical path items and compress non-essential tasks immediately.");
    suggestions.push("Assign a dedicated delivery manager to oversee day-to-day schedule recovery.");
  } else if (delay > 10) {
    suggestions.push("Set up weekly sprint reviews to detect and address further slippage early.");
    suggestions.push("Re-baseline the project schedule with realistic buffer estimates.");
  } else {
    suggestions.push("Maintain the current delivery cadence with monthly check-ins.");
  }

  // Payment suggestions
  if (project.payment === "blocked") {
    suggestions.push("Escalate the payment dispute to legal/finance immediately to unblock cash flow.");
    suggestions.push("Evaluate whether project continuation is feasible without settlement.");
  } else if (project.payment === "pending") {
    suggestions.push("Issue formal payment reminders and establish a clear settlement deadline.");
    suggestions.push("Negotiate a milestone-linked payment plan to reduce exposure.");
  } else if (project.payment === "partial") {
    suggestions.push("Agree on a staged payment schedule to close the outstanding balance.");
  } else {
    suggestions.push("Payment is current — maintain accurate financial records for future audits.");
  }

  // Resource suggestions
  if (res < 3) {
    suggestions.push("Hire short-term contractors or reassign internal staff to close the resource gap urgently.");
    suggestions.push("Identify and document single-points-of-failure in the current team.");
  } else if (res < 5) {
    suggestions.push("Cross-train team members to ensure coverage across critical roles.");
  } else {
    suggestions.push("Resource levels are healthy — document knowledge for future team transitions.");
  }

  // Risk-level suggestions
  if (risk === "critical" || risk === "high") {
    suggestions.push("Initiate a formal Risk Response Plan and assign a named risk owner.");
    suggestions.push("Perform a technical debt audit to identify hidden structural risks.");
    suggestions.push("Brief senior management and establish a daily stand-up for rapid resolution.");
  } else if (risk === "medium") {
    suggestions.push("Schedule a bi-weekly risk review meeting with the project lead.");
    suggestions.push("Organize a stakeholder alignment session to agree on revised recovery timelines.");
  }

  // Description-aware context
  if (description.trim()) {
    suggestions.push(`Given the nature of ${name}, ensure all third-party dependencies are captured.`);
    suggestions.push("Evaluate niche specialists who could accelerate project-specific bottlenecks.");
  }

  suggestions.push("Align risk mitigation actions with the organisation's overall Business Continuity Plan.");

  return suggestions;
}

interface AnalysisResult {
  project: NewProjectInput;
  score: number;
  risk: string;
  factors: ReturnType<typeof buildFactors>;
  mitigations: string[];
}

interface ProjectInputFormProps {
  onAddProject: (project: NewProjectInput) => void;
}

export function ProjectInputForm({ onAddProject }: ProjectInputFormProps) {
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const updateField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = projectSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormState;
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      setErrors(nextErrors);
      toast.error("Please fix the highlighted fields.");
      return;
    }

    const project = parsed.data as NewProjectInput;
    const { score, risk } = calculateProjectRisk(project);
    const factors    = buildFactors(project);
    const mitigations = buildMitigations(project, risk);

    const analysisResult: AnalysisResult = { project, score, risk, factors, mitigations };
    setResult(analysisResult);
    onAddProject(project);
    setForm(initialState);
    setErrors({});
    toast.success("Project analyzed and added to the dashboard.");
  };

  const handleDownload = async () => {
    if (!result) return;

    setIsDownloading(true);
    try {
      const payload = {
        name:        result.project.name,
        description: result.project.description,
        delay:       result.project.delay,
        payment:     result.project.payment,
        resources:   result.project.resources,
        score:       result.score,
        risk:        result.risk,
      };

      const response = await fetch("http://localhost:5000/download-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const blob   = await response.blob();
      const url    = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href  = url;
      anchor.download = `risk_report_${result.project.name.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      toast.success("✅ Report downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download report. Is the backend running?");
    } finally {
      setIsDownloading(false);
    }
  };

  const meta = result ? (RISK_META[result.risk] ?? RISK_META.low) : null;

  return (
    <div className="space-y-4">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-lg border border-border bg-card p-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-primary">
              Analyze New Project
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Provide organisation details and project metrics to receive an AI risk score instantly.
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
            <PlusCircle className="h-4 w-4 text-primary" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: 4 metric fields */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-2 text-xs text-muted-foreground">
              <span>Project / Org name</span>
              <Input
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Quantum Forecast"
              />
              {errors.name && <p className="text-[11px] text-destructive">{errors.name}</p>}
            </label>

            <label className="space-y-2 text-xs text-muted-foreground">
              <span>Delay (days)</span>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.delay}
                onChange={(e) => updateField("delay", e.target.value)}
                placeholder="35"
              />
              {errors.delay && <p className="text-[11px] text-destructive">{errors.delay}</p>}
            </label>

            <label className="space-y-2 text-xs text-muted-foreground">
              <span>Payment</span>
              <select
                value={form.payment}
                onChange={(e) => updateField("payment", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {paymentOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </option>
                ))}
              </select>
              {errors.payment && <p className="text-[11px] text-destructive">{errors.payment}</p>}
            </label>

            <label className="space-y-2 text-xs text-muted-foreground">
              <span>Resources</span>
              <Input
                type="number"
                min={1}
                max={10}
                value={form.resources}
                onChange={(e) => updateField("resources", e.target.value)}
                placeholder="5"
              />
              {errors.resources && <p className="text-[11px] text-destructive">{errors.resources}</p>}
            </label>
          </div>

          {/* Row 2: Organisation description — full width */}
          <label className="block space-y-2 text-xs text-muted-foreground">
            <span>Organisation description</span>
            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Describe what the organisation does, how it operates, its key dependencies, and any relevant context that affects risk…"
              rows={3}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {errors.description && <p className="text-[11px] text-destructive">{errors.description}</p>}
          </label>

          {/* Footer row */}
          <div className="flex flex-col gap-3 border-t border-border pt-4 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-muted-foreground">
              Input is scored instantly and pushed into both the table and chart.
            </p>
            <div className="flex items-center gap-2">
              {result && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25 }}
                >
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="md:min-w-44 gap-2 border-primary/40 text-primary hover:bg-primary/10 disabled:opacity-60"
                  >
                    {isDownloading ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Generating PDF…
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                        </svg>
                        Download Report
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
              <Button type="submit" className="md:min-w-40">
                Analyze &amp; add
              </Button>
            </div>
          </div>
        </form>
      </motion.section>

      {/* ── Risk Analysis Result Card ─────────────────────────────────────── */}
      <AnimatePresence>
        {result && meta && (
          <motion.section
            key="result-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className={`rounded-lg border ${meta.border} ${meta.bg} p-6`}
          >
            {/* Header */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Risk Analysis Result
                </p>
                <h3 className="mt-0.5 text-base font-bold text-foreground">
                  {result.project.name}
                </h3>
                {result.project.description && (
                  <p className="mt-1 text-xs text-muted-foreground max-w-xl">
                    {result.project.description}
                  </p>
                )}
              </div>

              {/* Big score badge */}
              <div className={`flex flex-col items-center justify-center rounded-xl border ${meta.border} bg-background/60 px-5 py-3 text-center`}>
                <span className={`text-3xl font-black leading-none ${meta.color}`}>{result.score}</span>
                <span className="mt-0.5 text-[10px] text-muted-foreground">/ 100</span>
                <span className={`mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${meta.color} ${meta.bg} border ${meta.border}`}>
                  {meta.label}
                </span>
              </div>
            </div>

            {/* Score breakdown table */}
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Why this score?
              </p>
              <div className="space-y-2">
                {result.factors.map((f) => {
                  const fmeta = RISK_META[f.severity] ?? RISK_META.low;
                  return (
                    <div
                      key={f.label}
                      className="flex flex-col gap-1 rounded-md border border-border bg-background/50 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${fmeta.color.replace("text-", "bg-")}`} />
                        <span className="text-xs font-semibold text-foreground">{f.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground sm:max-w-md sm:text-right">{f.detail}</p>
                      <span className={`ml-auto shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${fmeta.color} ${fmeta.bg}`}>
                        +{f.pts} pts
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mitigation measures */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Recommended Mitigation Measures
              </p>
              <ul className="space-y-1.5">
                {result.mitigations.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                    <span className={`mt-0.5 shrink-0 text-sm font-bold ${meta.color}`}>→</span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
