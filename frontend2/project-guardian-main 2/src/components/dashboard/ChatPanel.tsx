import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import type { Project } from "@/components/dashboard/dashboard-data";
import { getHighestRiskProject } from "@/components/dashboard/dashboard-data";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  projects: Project[];
}

// ── Terminology Dictionary ──────────────────────────────────────────────────
const TERMS: Record<string, string> = {
  "cash flow": "Cash flow refers to the movement of money into and out of the project. 'At risk' means that pending or blocked payments could stall operations, prevent hiring, or lead to project cancellation.",
  "cah flow": "Cash flow refers to the movement of money into and out of the project. 'At risk' means that pending or blocked payments could stall operations, prevent hiring, or lead to project cancellation.",
  "mitigation": "Mitigation involves taking proactive steps to reduce the likelihood or impact of a risk. Examples include hiring more staff, negotiating payments, or adjusting deadlines.",
  "risk score": "The risk score (0-100) is calculated based on schedule delay (55% weight), payment status (weighted penalty), and resource count. Higher scores indicate more severe project instability.",
  "delay": "Days behind the original baseline schedule. Delays over 5 days trigger increased risk points in our scoring model.",
  "resources": "The number of active team members. Fewer than 3 members is considered a critical 'single point of failure' risk.",
  "payment": "The financial status of the project. 'Blocked' or 'Pending' statuses indicate high financial risk and potential work stoppage.",
  "burned": "Burn rate is the rate at which the project is using up its budget. High delay and low resources often lead to a higher burn rate per milestone.",
  "burn rate": "Burn rate is the rate at which the project is using up its budget. High delay and low resources often lead to a higher burn rate per milestone.",
  "sla": "Service Level Agreement. In this context, it refers to the commitment made to the client. Delays impact SLA compliance.",
  "single point of failure": "This occurs when a project relies on too few people (Resources < 3). If one person is unavailable, the entire project may halt.",
};

// ── Fuzzy project finder ──────────────────────────────────────────────────────
function findProject(input: string, projects: Project[]): Project | undefined {
  const lower = input.toLowerCase().trim();

  // 1. Exact substring match on name or id
  const exact = projects.find(
    (p) =>
      lower.includes(p.name.toLowerCase()) ||
      lower.includes(p.id.toLowerCase()),
  );
  if (exact) return exact;

  // 2. Partial word overlap
  const queryWords = lower.split(/\s+/).filter((w) => w.length > 2);
  let bestMatch: Project | undefined;
  let bestScore = 0;

  for (const p of projects) {
    const nameWords = p.name.toLowerCase().split(/\s+/);
    const hits = queryWords.filter((qw) =>
      nameWords.some((nw) => nw.includes(qw) || qw.includes(nw) || nw.startsWith(qw)),
    ).length;
    if (hits > bestScore) {
      bestScore = hits;
      bestMatch = p;
    }
  }

  // At least 50% match
  return (bestScore >= queryWords.length * 0.5 && bestScore > 0) ? bestMatch : undefined;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function riskEmoji(risk: string) {
  return risk === "critical" ? "🔴" : risk === "high" ? "🟠" : risk === "medium" ? "🟡" : "🟢";
}

function quickMitigations(p: Project): string[] {
  const tips: string[] = [];
  if (p.delay > 30)       tips.push("Fast-track critical path items to recover schedule.");
  else if (p.delay > 5)   tips.push("Set up weekly sprint reviews to prevent further slippage.");
  if (p.payment === "blocked")  tips.push("Escalate the payment dispute to finance/legal immediately.");
  else if (p.payment === "pending") tips.push("Issue payment reminders — cash flow is at risk.");
  else if (p.payment === "partial") tips.push("Negotiate a staged payment plan to close the balance.");
  if (p.resources < 3)    tips.push("Hire contractors urgently — team is critically understaffed.");
  else if (p.resources < 5) tips.push("Cross-train team members to reduce key-person risk.");
  if (tips.length === 0)  tips.push("No urgent actions required — maintain routine oversight.");
  return tips;
}

function scoreBreakdown(p: Project): string {
  const payPts: Record<string, number> = { paid: 5, partial: 18, pending: 28, blocked: 40 };
  const delayPts = Math.round(Math.min(p.delay, 100) * 0.55);
  const resPts   = (10 - Math.min(Math.max(p.resources, 1), 10)) * 5;
  const payPt    = payPts[p.payment] ?? 20;
  return [
    `| Factor | Points |`,
    `|---|---|`,
    `| Schedule Delay (${p.delay} days) | +${delayPts} |`,
    `| Payment (${p.payment}) | +${payPt} |`,
    `| Resources (${p.resources} members) | +${resPts} |`,
    `| **Total** | **${p.score}** |`,
  ].join("\n");
}

// ── Main response builder ─────────────────────────────────────────────────────
function getResponse(input: string, projects: Project[]): string {
  const lower = input.toLowerCase().trim();

  // ── Greetings ──
  if (/^(hi|hello|hey|howdy|sup)\b/.test(lower)) {
    return "Hello! 👋 I'm the AI Analyst. Ask me about any project — scores, risks, mitigations, or a full summary.";
  }

  // ── Terminology Check ──
  for (const [term, explanation] of Object.entries(TERMS)) {
    if (lower.includes(term)) {
      return `**${term.toUpperCase()}**: ${explanation}`;
    }
  }

  // ── Help ──
  if (lower.includes("help") || lower.includes("what can you do")) {
    return [
      "Here's what I can help with:",
      "- **Project details** — *tell me about HealthBridge Diagnostics*",
      "- **Score breakdown** — *why is PRJ-001 scored 95?*",
      "- **Highest risk** — *which project is most critical?*",
      "- **Top risks** — *show me all high-risk projects*",
      "- **Mitigation tips** — *how can we reduce risk for PRJ-002?*",
      "- **Terminology** — *what is cash flow?*",
      "- **Summary** — *give me a project summary*",
    ].join("\n");
  }

  // ── Summary ──
  if (lower.includes("summary") || lower.includes("overview") || lower.includes("all project")) {
    const byRisk = [...projects].sort((a, b) => b.score - a.score);
    const lines = byRisk.map(
      (p) => `- ${riskEmoji(p.risk)} **${p.name}** (${p.id}) — Score: **${p.score}**, Risk: **${p.risk}**`,
    );
    const highest = getHighestRiskProject(projects);
    return [
      `I'm tracking **${projects.length} project(s)**. Here's the full list ranked by risk:\n`,
      ...lines,
      highest
        ? `\n⚠️ **Highest priority:** ${highest.name} needs immediate attention.`
        : "",
    ].join("\n");
  }

  // ── Highest / most critical ──
  if (
    lower.includes("highest") ||
    lower.includes("most critical") ||
    lower.includes("worst") ||
    lower.includes("most at risk")
  ) {
    const highest = getHighestRiskProject(projects);
    if (!highest) return "No projects loaded yet.";
    const tips = quickMitigations(highest);
    return [
      `${riskEmoji(highest.risk)} **${highest.name}** (${highest.id}) is the highest-risk project right now.`,
      `- Risk score: **${highest.score}/100** (${highest.risk})`,
      `- Delay: ${highest.delay} days | Payment: ${highest.payment} | Resources: ${highest.resources}`,
      `\n**Top actions:**`,
      ...tips.map((t) => `→ ${t}`),
    ].join("\n");
  }

  // ── All high/critical projects ──
  if (
    (lower.includes("high") || lower.includes("critical")) &&
    (lower.includes("all") || lower.includes("list") || lower.includes("show") || lower.includes("projects"))
  ) {
    const risky = projects.filter((p) => p.risk === "critical" || p.risk === "high");
    if (risky.length === 0) return "✅ Great news — no projects are currently high or critical risk!";
    return [
      `Found **${risky.length}** high/critical project(s):\n`,
      ...risky.map(
        (p) =>
          `${riskEmoji(p.risk)} **${p.name}** — Score ${p.score}, Delay ${p.delay}d, Payment: ${p.payment}, Resources: ${p.resources}`,
      ),
    ].join("\n");
  }

  // ── Low risk projects ──
  if (lower.includes("low risk") || lower.includes("safe") || lower.includes("no risk")) {
    const safe = projects.filter((p) => p.risk === "low");
    if (safe.length === 0) return "⚠️ No projects are currently in the low-risk category.";
    return [
      `**${safe.length}** project(s) are low risk:\n`,
      ...safe.map((p) => `🟢 **${p.name}** (${p.id}) — Score ${p.score}`),
    ].join("\n");
  }

  // ── Specific project ──
  const project = findProject(lower, projects);

  if (project) {
    const wantsScore =
      lower.includes("score") || lower.includes("why") ||
      lower.includes("breakdown") || lower.includes("how") || lower.includes("explain");
    const wantsMitigation =
      lower.includes("mitig") || lower.includes("fix") ||
      lower.includes("improve") || lower.includes("reduce") ||
      lower.includes("action") || lower.includes("what can");

    if (wantsScore) {
      return [
        `📊 **Score breakdown for ${project.name} (${project.id})**\n`,
        scoreBreakdown(project),
        `\nThe weighted formula combines schedule delay (55%), payment status, and resource availability to arrive at a final score of **${project.score}/100** — rated **${project.risk}**.`,
      ].join("\n");
    }

    if (wantsMitigation) {
      const tips = quickMitigations(project);
      return [
        `🛠️ **Mitigation actions for ${project.name}:**\n`,
        ...tips.map((t) => `→ ${t}`),
        `\nFor a full detailed report, use the **Download Report** button after analyzing this project.`,
      ].join("\n");
    }

    // Default: full project card
    const tips = quickMitigations(project);
    return [
      `${riskEmoji(project.risk)} **${project.name}** (${project.id})`,
      project.description ? `> ${project.description}` : "",
      ``,
      `| Field | Value |`,
      `|---|---|`,
      `| Risk Score | **${project.score} / 100** |`,
      `| Risk Level | **${project.risk.toUpperCase()}** |`,
      `| Delay | ${project.delay} days |`,
      `| Payment | ${project.payment} |`,
      `| Resources | ${project.resources} members |`,
      ``,
      `**Recommended actions:**`,
      ...tips.map((t) => `→ ${t}`),
    ]
      .filter((l) => l !== undefined)
      .join("\n");
  }

  // ── Count / stats ──
  if (lower.includes("how many") || lower.includes("count")) {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const p of projects) counts[p.risk]++;
    return [
      `**Project risk distribution** (${projects.length} total):`,
      `🔴 Critical: **${counts.critical}**`,
      `🟠 High: **${counts.high}**`,
      `🟡 Medium: **${counts.medium}**`,
      `🟢 Low: **${counts.low}**`,
    ].join("\n");
  }

  // ── Fallback ──
  const highest = getHighestRiskProject(projects);
  return [
    `I'm sorry, I didn't quite catch that. I am your AI Risk Analyst.`,
    `I can explain terms like **cash flow**, **mitigation**, or **risk score**.`,
    highest
      ? `\nCurrently, the highest risk project is **${highest.name}** (${highest.risk}).`
      : "",
    `\nTry asking:`,
    `- *"What is cash flow?"*`,
    `- *"Tell me about [project name]"*`,
    `- *"Show all high-risk projects"*`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ChatPanel({ projects }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I can answer based on the current live project list and your latest inputs.\n\nTry asking:\n- *\"Tell me about HealthBridge Diagnostics\"*\n- *\"Which project is highest risk?\"*\n- *\"How can we reduce risk for PRJ-002?\"*",
    },
  ]);
  const [input, setInput]       = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const send = async () => {
    if (!input.trim()) return;
    const currentInput = input;
    setMessages((prev) => [...prev, { role: "user", content: currentInput }]);
    setInput("");
    setIsTyping(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: currentInput, projects }),
      });

      if (!response.ok) throw new Error("API failed");
      const data = await response.json();
      
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch (err) {
      console.warn("Groq API failed, falling back to local logic:", err);
      // Fallback to local rule-based engine
      const localResponse = getResponse(currentInput, projects);
      setMessages((prev) => [...prev, { role: "assistant", content: localResponse }]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestions = [
    "Which project is highest risk?",
    "What is cash flow?",
    "Show all high-risk projects",
    "How many projects per risk level?",
    "Tell me about HealthBridge Diagnostics",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="flex h-full flex-col rounded-lg border border-border bg-card"
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-primary">AI Analyst</h2>
          <p className="text-[10px] text-muted-foreground">Synced with live project input</p>
        </div>
        <div className="ml-auto h-2 w-2 animate-pulse rounded-full bg-green-500" />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                  msg.role === "assistant" ? "bg-primary/10" : "bg-secondary"
                }`}
              >
                {msg.role === "assistant" ? (
                  <Bot className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <User className="h-3.5 w-3.5 text-secondary-foreground" />
                )}
              </div>
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "assistant"
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                <div className="prose prose-sm max-w-none break-words text-inherit prose-p:my-1 prose-strong:text-inherit prose-ul:my-1 prose-li:my-0 prose-table:text-xs">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-secondary px-3 py-2">
              {[0, 1, 2].map((dot) => (
                <motion.div
                  key={dot}
                  className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: dot * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Quick suggestions */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => setInput(s)}
            className="shrink-0 rounded-md border border-border bg-secondary/50 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-border p-3">
        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about any project…"
            className="flex-1 rounded-md border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
          <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </motion.div>
  );
}
