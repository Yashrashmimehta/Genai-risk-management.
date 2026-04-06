from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from database import create_tables, connect_db
from risk_scoring import calculate_risk
from chatbot import chatbot_query
from project_agent import analyze_project
from database import insert_sample_data
import io
import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether,
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

create_tables()
insert_sample_data()

# ── Colour palette ────────────────────────────────────────────────────────────
RISK_COLORS = {
    "Critical": colors.HexColor("#dc2626"),
    "High":     colors.HexColor("#f97316"),
    "Medium":   colors.HexColor("#eab308"),
    "Low":      colors.HexColor("#22c55e"),
}

DARK   = colors.HexColor("#0f172a")
MUTED  = colors.HexColor("#64748b")
LIGHT1 = colors.HexColor("#f8fafc")
LIGHT2 = colors.HexColor("#f1f5f9")
BORDER = colors.HexColor("#e2e8f0")
WHITE  = colors.white

# ── Score factor breakdown ────────────────────────────────────────────────────
PAYMENT_PENALTY = {"paid": 5, "partial": 18, "pending": 28, "blocked": 40}
PAYMENT_LABEL = {
    "paid":    "Fully paid — minimal financial risk.",
    "partial": "Partially paid — some financial exposure present.",
    "pending": "Pending — elevated cash-flow risk; collections at risk.",
    "blocked": "Blocked — critical payment issue that may halt the project.",
}


def _score_factors(delay: int, payment: str, resources: int):
    """Return per-factor point contributions identical to the frontend logic."""
    delay_pts   = round(min(max(delay, 0), 100) * 0.55)
    pay_pts     = PAYMENT_PENALTY.get(payment.lower(), 20)
    res_pts     = (10 - min(max(resources, 1), 10)) * 5
    total       = min(delay_pts + pay_pts + res_pts, 100)

    delay_detail = (
        f"{delay} days behind schedule — significantly increases delivery risk."
        if delay > 5
        else f"{delay} days — within acceptable limits."
    )
    pay_detail = (
        f"{payment.capitalize()} — "
        + PAYMENT_LABEL.get(payment.lower(), "Status unknown — manual review required.")
    )
    res_detail = (
        f"Only {resources} team member(s) — resource shortage may cause burnout and delays."
        if resources < 3
        else f"{resources} team members — adequately staffed for the project scope."
    )

    return [
        {"factor": "Schedule Delay",         "pts": delay_pts, "detail": delay_detail},
        {"factor": "Payment Status",          "pts": pay_pts,   "detail": pay_detail},
        {"factor": "Resource Availability",   "pts": res_pts,   "detail": res_detail},
    ], total


def _mitigation_items(project_name: str, description: str,
                      risk_level: str, delay: int,
                      payment: str, resources: int) -> list[str]:
    """Build a contextual, prioritised list of mitigation recommendations."""
    items = []

    # ── Schedule ──
    if delay > 30:
        items.append("Fast-track critical path items and compress non-essential tasks immediately.")
        items.append("Assign a dedicated delivery manager to oversee day-to-day schedule recovery.")
    elif delay > 10:
        items.append("Set up weekly sprint reviews to detect and address further slippage early.")
        items.append("Re-baseline the project schedule with realistic buffer estimates.")
    else:
        items.append("Maintain the current delivery cadence; perform monthly schedule health checks.")

    # ── Payment ──
    pay = payment.lower()
    if pay == "blocked":
        items.append("Escalate the payment dispute to legal/finance immediately to unblock cash flow.")
        items.append("Evaluate whether project continuation is feasible without payment resolution.")
    elif pay == "pending":
        items.append("Issue formal payment reminders and establish a clear settlement deadline.")
        items.append("Negotiate a milestone-linked payment plan to reduce exposure.")
    elif pay == "partial":
        items.append("Agree on a staged payment schedule to close the outstanding balance progressively.")
        items.append("Introduce invoice-tracking to prevent further payment delays.")
    else:
        items.append("Payment is current — maintain accurate financial records for future audits.")

    # ── Resources ──
    if resources < 3:
        items.append("Hire short-term contractors or reassign internal staff to close the resource gap urgently.")
        items.append("Identify and document single-points-of-failure in the current team immediately.")
    elif resources < 5:
        items.append("Cross-train team members to ensure coverage across critical roles.")
        items.append("Consider part-time specialist support for high-risk deliverables.")
    else:
        items.append("Resource levels are healthy — document knowledge to support future team transitions.")

    # ── Risk-level escalation items ──
    rl = risk_level.lower()
    if rl in ("critical", "high"):
        items.append("Initiate a formal Risk Response Plan and assign a named risk owner.")
        items.append("Brief senior management and establish a daily stand-up for rapid issue resolution.")
        items.append("Define clear escalation triggers and response timelines in the project charter.")
        items.append("Perform a technical debt audit to identify hidden structural risks that may worsen delays.")
    elif rl == "medium":
        items.append("Schedule bi-weekly risk review meetings with the project lead and key stakeholders.")
        items.append("Update the risk register and re-assess top risks at each milestone.")
        items.append("Organize a stakeholder alignment session to ensure all parties agree on the revised recovery timeline.")
    else:
        items.append("Conduct a quarterly risk register review to ensure no new risks have materialised.")

    # ── Description-aware generic items ──
    if description.strip():
        items.append(
            f"Given the nature of {project_name} — {description[:120].strip()}"
            f"{'…' if len(description) > 120 else ''} — "
            "ensure all third-party dependencies and integration points are captured in the risk register."
        )
        items.append("Evaluate potential external consultants or niche specialists who could accelerate project-specific bottlenecks.")

    items.append("Align risk mitigation actions with the organisation's overall Business Continuity Plan.")
    items.append("Consider an independent third-party audit of the project health if critical trends persist for over 30 days.")

    return items


# ── PDF builder ───────────────────────────────────────────────────────────────

def generate_pdf(project_name: str, description: str,
                 risk_score: int, risk_level: str,
                 factors: list, mitigations: list[str],
                 timestamp: str) -> io.BytesIO:
    """Build and return a styled A4 PDF risk report as a BytesIO buffer."""

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm,
    )

    styles  = getSampleStyleSheet()
    rc      = RISK_COLORS.get(risk_level, MUTED)

    # ── Custom styles ─────────────────────────────────────────────────────────
    def S(name, **kw):
        return ParagraphStyle(name, parent=styles["Normal"], **kw)

    title_s    = S("T",  fontSize=22, textColor=DARK,  spaceAfter=4,  leading=26, alignment=TA_LEFT)
    sub_s      = S("Su", fontSize=9,  textColor=MUTED, spaceAfter=3,  leading=13)
    section_s  = S("Se", fontSize=11, textColor=DARK,  spaceBefore=16, spaceAfter=6,
                   fontName="Helvetica-Bold")
    body_s     = S("B",  fontSize=9.5, textColor=colors.HexColor("#374151"), leading=15, spaceAfter=3)
    bullet_s   = S("Bu", fontSize=9.5, textColor=colors.HexColor("#374151"), leading=15,
                   leftIndent=10, spaceAfter=4)
    footer_s   = S("F",  fontSize=7.5, textColor=colors.HexColor("#9ca3af"), alignment=TA_CENTER)

    hr = lambda after=8: HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=after)

    story = []

    # ── Page header ───────────────────────────────────────────────────────────
    story += [
        Paragraph("AI Risk Analysis Report", title_s),
        Paragraph("Generated by <b>SENTINEL</b> · AI Risk Monitor", sub_s),
        Paragraph(f"Timestamp: {timestamp}", sub_s),
        hr(12),
    ]

    # ── Organisation overview ─────────────────────────────────────────────────
    story.append(Paragraph("Organisation Overview", section_s))

    org_data = [["Field", "Details"]]
    org_data.append(["Organisation / Project", project_name])
    if description.strip():
        # wrap long descriptions
        desc_lines = []
        words = description.split()
        line  = ""
        for w in words:
            if len(line) + len(w) + 1 > 70:
                desc_lines.append(line)
                line = w
            else:
                line = (line + " " + w).strip()
        if line:
            desc_lines.append(line)
        org_data.append(["Description", "\n".join(desc_lines)])
    org_data.append(["Report Date", timestamp])

    org_tbl = Table(org_data, colWidths=[4.5*cm, 12*cm])
    org_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  DARK),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  WHITE),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("ALIGN",         (0, 0), (-1, -1), "LEFT"),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",    (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [LIGHT1, LIGHT2]),
        ("GRID",          (0, 0), (-1, -1), 0.4, BORDER),
    ]))
    story += [org_tbl, Spacer(1, 10)]

    # ── Risk verdict banner ───────────────────────────────────────────────────
    story.append(Paragraph("Risk Verdict", section_s))

    verdict_data = [
        ["Risk Score", "Risk Level", "Assessment"],
        [f"{risk_score} / 100", risk_level,
         "Immediate action required." if risk_level in ("Critical","High")
         else "Close monitoring advised." if risk_level == "Medium"
         else "Routine oversight sufficient."],
    ]
    verdict_tbl = Table(verdict_data, colWidths=[4*cm, 4*cm, 8.5*cm])
    verdict_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  DARK),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  WHITE),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("ALIGN",         (0, 0), (-1, -1), "LEFT"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
        ("BACKGROUND",    (0, 1), (-1, 1),  LIGHT1),
        ("GRID",          (0, 0), (-1, -1), 0.4, BORDER),
        # Colour the risk score & level cells
        ("TEXTCOLOR",     (0, 1), (0, 1),   rc),
        ("TEXTCOLOR",     (1, 1), (1, 1),   rc),
        ("FONTNAME",      (0, 1), (1, 1),   "Helvetica-Bold"),
        ("FONTSIZE",      (0, 1), (0, 1),   13),
    ]))
    story += [verdict_tbl, Spacer(1, 10)]

    # ── Score breakdown ───────────────────────────────────────────────────────
    story.append(Paragraph("Score Breakdown — Why This Score?", section_s))
    story.append(Paragraph(
        f"The total risk score of <b>{risk_score}/100</b> is composed of three weighted factors. "
        "Each factor contributes a number of points based on the values you provided.",
        body_s,
    ))

    breakdown_data = [["Risk Factor", "Points", "Detail"]]
    for f in factors:
        breakdown_data.append([f["factor"], f"+{f['pts']}", f["detail"]])
    breakdown_data.append(["TOTAL SCORE", str(risk_score), ""])

    col_w = [4*cm, 2*cm, 10.5*cm]
    bd_tbl = Table(breakdown_data, colWidths=col_w)
    bd_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  DARK),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  WHITE),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("ALIGN",         (0, 0), (-1, -1), "LEFT"),
        ("ALIGN",         (1, 0), (1, -1),  "CENTER"),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",    (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
        ("ROWBACKGROUNDS",(0, 1), (-1, -2), [LIGHT1, LIGHT2]),
        ("GRID",          (0, 0), (-1, -1), 0.4, BORDER),
        # Total row
        ("BACKGROUND",    (0, -1), (-1, -1), colors.HexColor("#1e293b")),
        ("TEXTCOLOR",     (0, -1), (-1, -1), WHITE),
        ("FONTNAME",      (0, -1), (-1, -1), "Helvetica-Bold"),
        ("TEXTCOLOR",     (1, -1), (1, -1),  rc),
        ("FONTSIZE",      (1, -1), (1, -1),  11),
    ]))
    story += [bd_tbl, Spacer(1, 10)]

    # ── Mitigation measures ───────────────────────────────────────────────────
    story.append(Paragraph("Recommended Mitigation Measures", section_s))
    story.append(Paragraph(
        "The following actions are tailored to the specific risk profile of this organisation. "
        "Items are ordered by urgency.",
        body_s,
    ))

    for i, item in enumerate(mitigations, 1):
        # Escape XML special chars
        safe = (item.replace("&", "&amp;")
                    .replace("<", "&lt;")
                    .replace(">", "&gt;"))
        story.append(Paragraph(f"<b>{i}.</b>  {safe}", bullet_s))

    # ── Footer ────────────────────────────────────────────────────────────────
    story += [
        Spacer(1, 20),
        hr(8),
        Paragraph(
            "This report was automatically generated by the SENTINEL AI Risk Monitor. "
            "Results are indicative only and should be reviewed by a qualified project manager.",
            footer_s,
        ),
    ]

    doc.build(story)
    buffer.seek(0)
    return buffer


# ── Existing routes ───────────────────────────────────────────────────────────

@app.route("/projects")
def get_projects():
    conn = connect_db()
    cur  = conn.cursor()
    cur.execute("SELECT * FROM projects")
    return jsonify(cur.fetchall())


@app.route("/risk")
def get_risk():
    conn = connect_db()
    cur  = conn.cursor()
    cur.execute("SELECT * FROM projects")
    result = []
    for p in cur.fetchall():
        risk = calculate_risk(p[3], p[4], p[5])
        result.append({"project": p[1], "risk": risk})
    return jsonify(result)


@app.route("/chatbot", methods=["POST"])
def chatbot():
    question = request.json["question"]
    answer   = chatbot_query(question)
    return jsonify({"response": answer})


@app.route("/analyze", methods=["POST"])
def analyze_new_project():
    data      = request.json
    name      = data.get("name")
    delay     = int(data.get("delay"))
    payment   = data.get("payment")
    resources = int(data.get("resources"))
    risk      = calculate_risk(delay, payment, resources)
    return jsonify({"project": name, "risk": risk})


# ── Download report ───────────────────────────────────────────────────────────

@app.route("/download-report", methods=["POST"])
def download_report():
    """
    Accepts JSON:
      { name, description, delay, payment, resources, score, risk }
    Generates and streams a styled PDF risk report.
    """
    data = request.json

    project_name = data.get("name",        "Unknown Project")
    description  = data.get("description", "")
    risk_level   = data.get("risk",        "low").capitalize()
    risk_score   = int(data.get("score",   0))
    delay        = int(data.get("delay",   0))
    payment      = data.get("payment",     "unknown")
    resources    = int(data.get("resources", 1))

    timestamp = datetime.datetime.now().strftime("%Y-%m-%d  %H:%M:%S")

    factors, _ = _score_factors(delay, payment, resources)

    mitigations = _mitigation_items(
        project_name=project_name,
        description=description,
        risk_level=risk_level,
        delay=delay,
        payment=payment,
        resources=resources,
    )

    pdf_buffer = generate_pdf(
        project_name=project_name,
        description=description,
        risk_score=risk_score,
        risk_level=risk_level,
        factors=factors,
        mitigations=mitigations,
        timestamp=timestamp,
    )

    safe_name = "".join(
        c if c.isalnum() or c in "-_" else "_" for c in project_name
    )
    filename = f"risk_report_{safe_name}.pdf"

    return send_file(
        pdf_buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename,
    )


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
