# CosmeFlow People — AI Workforce Ready Architecture

## HR Operating System + AI Workforce Platform Architecture

> **Axiom:** "System detects ➔ AI investigates ➔ AI prepares ➔ Human decides ➔ System executes ➔ Everything is audited"

---

## 1. Executive Summary & Core Philosophy

CosmeFlow People V1 is engineered as an **HR Operating System + AI Workforce Platform**, designed from the foundation up to support two complementary workforces:
1. **Human Workforce**: Employees, Supervisors, Managers, HR Officers, HR Managers, and Executives.
2. **AI Workforce**: Specialized Digital Workers (AI Agents) that handle context gathering, anomaly detection, evidence synthesis, and action preparation.

### Critical Design Rule: Digital Worker, NOT a Chatbot
AI in CosmeFlow People is **NOT** a superficial chatbot widget. Each AI Agent is modeled as a **Digital Worker** with:
- **Identity**: Unique `agent_code` and cryptographic/UUID identity.
- **Role & Mission**: Explicit functional purpose and boundary.
- **Permission & Least Privilege**: Granular allowed resources, actions, and scopes.
- **Prohibited High-Risk Actions**: Strictly hardcoded and database-enforced blocks on high-impact employment decisions.
- **Task Queue & Event Triggers**: Asynchronous execution triggered by domain events or cron schedules.
- **Human-in-the-Loop Governance**: Multi-tier approval thresholds.
- **Append-Only Audit Trail**: Full traceability of inputs, analysis, recommendations, and human decisions.

---

## 2. The 8 Logical Layers

```
Layer 8: Audit & Evidence (domain_events, ai_activity_logs, audit_logs)
                           ▲
Layer 7: Execution & Action Items (action_items, document_drafts)
                           ▲
Layer 6: Human Decision (human_approvals, approval_matrix, supervisor review)
                           ▲
Layer 5: AI Workforce (ai_agents, ai_tasks, ai_recommendations, ai_jobs)
                           ▲
Layer 4: Case Management (hr_cases, case_evidence, case_comments, case_actions)
                           ▲
Layer 3: Rule Engine (deterministic calculation: leave balance, overtime, exception flags)
                           ▲
Layer 2: Workflow Engine (approval_requests, notifications, SLA timers, escalation)
                           ▲
Layer 1: System of Record (employees, departments, work_areas, leave_policies, attendance_daily)
```

### Deterministic Integrity Rule
* **AI output is NEVER the authoritative System of Record.**
* The PostgreSQL database and deterministic business rules remain the sole authority for attendance logs, leave balances, organizational reporting, and payroll-ready data.
* AI may only observe, interpret, summarize, draft, and recommend.

---

## 3. Registered Digital Workers (Initial Fleet)

| Agent Code | Agent Name | Risk Level | Mission & Responsibilities | V1 Status |
| :--- | :--- | :---: | :--- | :---: |
| `AGENT-HR-01` | **AI HR Officer** | `MEDIUM` | Support daily HR operations by reviewing cases, collecting evidence, preparing documents, and escalating decisions. | `PLANNED` |
| `AGENT-ATT-01` | **AI Attendance Officer** | `LOW` | Scan raw punch logs, compare with shifts and approved leaves, detect anomalies (missing punch, late, absence), and assemble daily briefs. | `PLANNED` |
| `AGENT-LEAVE-01` | **AI Leave Coordinator** | `LOW` | Validate leave policies, check leave balances, analyze department workforce overlap, and follow up on pending approval SLAs. | `PLANNED` |
| `AGENT-WF-01` | **AI Workforce Analyst** | `HIGH` | Evaluate daily 07:45 morning factory manpower readiness, compare with production orders (e.g. JHD-309), and flag critical skill gaps. | `PLANNED` |
| `AGENT-COMP-01` | **AI Compliance Assistant** | `HIGH` | Compile evidence packs, cross-reference factory policies and Thai labor laws, and prepare draft disciplinary/compliance summaries. | `PLANNED` |
| `AGENT-PEOPLE-01` | **AI People Analyst** | `MEDIUM` | Analyze longitudinal trends in absenteeism, turnover, department attendance patterns, and overtime cost variances. | `PLANNED` |

---

## 4. Permission Model & Principle of Least Privilege

AI agents do **NOT** inherit administrative or superuser privileges. Each agent is bound to explicit row-level permissions in `ai_agent_permissions`:

### Granular Scope Definitions
- `SELF`: Own tasks and drafts only.
- `DEPARTMENT`: Assigned factory departments (e.g. Mixing, Filling, Packing).
- `SITE`: Factory-wide operational data.
- `NONE`: Strictly prohibited.

### Strict High-Risk Prohibitions (Never Autonomous)
The following actions must **NEVER** become autonomous AI actions under any circumstance:
1. **Employee Termination** (`employee_termination: EXECUTE`)
2. **Salary & Wage Modification** (`salary: CHANGE`)
3. **Payroll Deduction & Disciplinary Penalties** (`payroll: DEDUCT`)
4. **Final Warning Issuance** (`warning_letter: ISSUE`)
5. **Leave Balance Overrides** (`leave_balance: OVERRIDE`)
6. **Raw Attendance Tampering** (`raw_attendance: MODIFY`)
7. **Legal & Formal Determinations**

---

## 5. Human-in-the-Loop (HITL) Governance Tiers

```
┌─────────────────────────────────────────────────────────────┐
│ LEVEL 0: OBSERVE (No Approval Required)                     │
│ Read attendance, detect exceptions, compare shift roster   │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ LEVEL 1: RECOMMEND (Information Only)                       │
│ Present recommendation: "Recommend supervisor confirmation" │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ LEVEL 2: PREPARE (Drafting & Case Assembly)                 │
│ Prepare HR Case, compile Evidence Pack, draft notice letter │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ LEVEL 3: EXECUTE AFTER APPROVAL (Strict Human Gate)          │
│ System executes task ONLY after explicit human approval     │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Case Management & The "Evidence Pack" Architecture

When exceptions cannot be resolved automatically, they transition into trackable cases (`hr_cases`):

### The 4 Elements of an AI Evidence Pack
When an AI Digital Worker prepares a case summary, it must strictly separate:
1. **FACT**: What the database and device logs objectively record (e.g. *"Punch IN at 07:58, no punch OUT after 17:00"*).
2. **POLICY**: The applicable rule or standard operating procedure (e.g. *"Work Rule Section 4.2 requires notification before 08:30"*).
3. **ANALYSIS**: The detected pattern or risk (e.g. *"Packing Line 2 has 2 missing operators today, causing manpower capacity to drop to 84%"*).
4. **RECOMMENDATION**: The suggested human action (e.g. *"Request supervisor verification of physical presence"*).

---

## 7. Action Items Inbox ("What Needs Your Attention?")

The HR Command Center and Manager views center around the **Action Inbox** (`action_items`):
- Rather than navigating multiple complex sub-menus, stakeholders receive a unified, priority-ranked queue of decisions:
  - Pending Leave Approvals (with SLA countdown)
  - Unresolved Attendance Exceptions
  - HR Cases awaiting investigation comments
  - Factory Workforce capacity warnings

---

## 8. Event-Driven Architecture (Domain Events)

All critical business transactions emit structured domain events into `domain_events`:
- `leave.requested`
- `leave.approved`
- `leave.rejected`
- `attendance.imported`
- `attendance.exception.detected`
- `attendance.adjustment.requested`
- `attendance.adjustment.approved`
- `case.created`
- `case.updated`
- `action_item.status_changed`

This decoupling ensures that future AI worker jobs (e.g. `JOB-ATT-DAILY`, `JOB-LEAVE-VALIDATE`) can subscribe to real events without tight coupling to application API handlers.

---

## 9. Data Privacy & Redaction Layer

To maintain compliance with PDPA and employee data privacy:
- Digital Workers receive **only** the minimum necessary fields required for their mission.
- National ID numbers, bank account details, and confidential medical diagnostic text are redacted or masked before reaching AI reasoning contexts.
- Prompts and agent instructions are versioned in `ai_agent_versions` to guarantee auditable reproducibility.
