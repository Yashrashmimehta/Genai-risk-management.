# SENTINEL: GenAI Project Risk Monitor

An intelligent, AI-powered full-stack platform that monitors, analyzes, and predicts project risks using a multi-agent simulation architecture. SENTINEL helps organizations move from reactive to proactive risk management.

---

## 🚀 Project Overview

This system helps organizations track and mitigate project risks based on real-time parameters and contextual organisation data. By combining metric-based scoring with natural language understanding, it provides a 360-degree view of project health.

**Core Monitoring Metrics:**
- **Schedule Delay**: Real-time tracking of baseline vs. actual progress.
- **Payment Status**: Financial health monitoring (Paid, Pending, Partial, Blocked).
- **Resource Availability**: Team capacity and "Single Point of Failure" detection.
- **Organisation Context**: Qualitative descriptions of the organisation's nature and dependencies.

---

## ✨ Key Features

- **Automated Risk Analysis**: Instant scoring (0-100) and classification (Low, Medium, High, Critical).
- **Organisation Context Engine**: New input field for detailed organisation descriptions, used to tailor risk insights.
- **AI Analyst (Smart Chatbot)**:
    - **Fuzzy Search**: Find projects even with typos in the name.
    - **Glossary Support**: Ask the bot to explain terms like *"Cash Flow"*, *"Mitigation"*, or *"Burn Rate"*.
    - **Contextual Insights**: The bot breaks down why a project is risky and suggests targeted fixes.
- **Professional PDF Reporting**: Generate high-quality, styled PDF risk reports using `ReportLab` with detailed mitigation checklists and score breakdowns.
- **Dynamic Dashboard**: Interactive charts and real-time project tables.
- **Multi-Agent Simulation**: Logic separated into specialized "Agents" for scoring, tracking, and reporting.

---

## 🛠️ Tech Stack

### Frontend
- **React (Vite)** + **TypeScript**
- **Tailwind CSS** + **Shadcn UI**
- **Framer Motion** (for smooth animations)
- **Lucide React** (icons)

### Backend
- **Python (Flask)**
- **ReportLab** (PDF Generation Engine)
- **Flask-CORS** (API Security)
- **SQLite** (Local Database Support)

---

## 🤖 System Architecture (Agents)

The system is designed using a modular, agent-inspired logic architecture:

1. **Risk Scoring Agent**: Uses a weighted formula (Delay 55%, Payment, Resources) to calculate risk point totals.
2. **Project Tracking Agent**: Manages the persistence of project data and organisation profiles.
3. **Mitigation Agent**: Dynamically generates actionable "What more can be done" lists based on specific project bottlenecks.
4. **AI Communication Agent**: The chatbot interface that translates raw data into human-readable risk summaries.

---

## 📈 How It Works

1. **Input**: User enters project metrics and a detailed organisation description.
2. **Analysis**: The Backend processes the data, calculates the weighted risk score, and maps it to a severity level.
3. **Response**: 
    - The dashboard updates charts and tables immediately.
    - The **AI Analyst** becomes ready to discuss the new project.
4. **Reporting**: User can download a comprehensive PDF report containing a professional verdict and recovery plan.

---

## 📂 Project Structure

```text
├── backend/
│   ├── app.py              # Main API & PDF Logic
│   ├── database.py         # Persistence layer
│   ├── requirements.txt    # Python dependencies
│   └── risk_scoring.py     # Weighted logic
└── frontend/
    ├── src/
    │   ├── components/     # UI Components (ChatPanel, ProjectInputForm)
    │   ├── hooks/          # Custom React Hooks
    │   └── lib/            # Utilities
    └── package.json        # Frontend dependencies
```

---

## 🌍 Live Demo
- **Frontend**: [Link to Frontend](https://genai-risk-management-1-kg15.onrender.com/)
- **Backend API**: [Link to Backend](https://genai-risk-management-7ea9.onrender.com)

---

## 🎓 Conclusion
This project demonstrates the power of combining modern Full-Stack development with AI logic to solve complex organizational challenges like risk monitoring and resource allocation.

---

## 👥 Authors
Developed with ❤️ by:
- **Rashi Ranjan**
- **Monikonkona Ray**
- **Yash Mehta**
- **Akhtaruzzaman**

---
