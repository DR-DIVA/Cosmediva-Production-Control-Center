# Implementation Plan — AI Workforce Ready Architecture (CosmeFlow People V1 Addendum)

Redesign CosmeFlow People V1 to establish a future-proof, 8-layer **HR Operating System + AI Workforce Platform** without expanding current V1 execution scope beyond disciplined boundaries.

## User Review Required

> [!IMPORTANT]
> **Disciplined Scope Boundary**: In strict adherence to Section 41 & 46 of the prompt:
> - No fake chatbot or fake AI recommendations will be implemented.
> - All 16 AI-ready and Case Management tables will be created in PostgreSQL on Supabase.
> - Case Management and Action Items will be actively wired to **real V1 operational flows** (Attendance Exceptions, Missing Punch, Pending Leave Approvals).
> - Domain Event emission will be integrated directly into Leave and Attendance APIs.
> - An "AI Workforce Registry & Digital Workers" overview will be added to the HR/Admin view with clear "AI Workforce — Planned (Phase 8)" status badges.

---

## Proposed Architectural Layers (8-Layer Design)

1. **Layer 1 — System of Record**: PostgreSQL (Supabase) storing Employees, Org, Leave, Attendance, Schedules, Policies.
2. **Layer 2 — Workflow Engine**: Approval Matrix, Routing, Escalation, Reminders.
3. **Layer 3 — Rule Engine**: Deterministic calculation (Leave accrual, pre-validation, attendance exceptions). AI never overrides this.
4. **Layer 4 — Case Management**: `hr_cases`, `case_evidence`, `case_comments`, `case_actions` for investigating exceptions.
5. **Layer 5 — AI Workforce Registry**: `ai_agents`, `ai_agent_permissions`, `ai_agent_versions`, `ai_jobs`, `ai_job_runs`, `ai_tasks`, `ai_recommendations`, `ai_activity_logs`.
6. **Layer 6 — Human Decision**: `human_approvals` (Level 0: Observe, Level 1: Recommend, Level 2: Prepare, Level 3: Execute after Approval). Prohibited autonomous actions enforced.
7. **Layer 7 — Execution & Action Items**: `action_items` ("What Needs Your Attention?").
8. **Layer 8 — Audit & Evidence**: `domain_events` + append-only audit trail.

---

## Proposed Changes

### 1. Database Migration & Schema Expansion

#### [NEW] `scripts/migrate_ai_workforce.js`
Creates all 16 future-ready tables with foreign keys, indexes, and constraints:
- `hr_cases` (with auto-generated case numbers e.g. `CASE-2026-001`)
- `case_evidence`
- `case_comments`
- `case_actions`
- `action_items`
- `domain_events`
- `ai_agents`
- `ai_agent_permissions`
- `ai_agent_versions`
- `ai_jobs`
- `ai_job_runs`
- `ai_tasks`
- `ai_recommendations`
- `ai_activity_logs`
- `human_approvals`
- `document_drafts`

#### [NEW] `scripts/seed_ai_workforce.js`
Seeds:
- 6 Initial Digital Workers:
  1. `AI HR Officer` (`AGENT-HR-01`)
  2. `AI Attendance Officer` (`AGENT-ATT-01`)
  3. `AI Leave Coordinator` (`AGENT-LEAVE-01`)
  4. `AI Workforce Analyst` (`AGENT-WF-01`)
  5. `AI Compliance Assistant` (`AGENT-COMP-01`)
  6. `AI People Analyst` (`AGENT-PEOPLE-01`)
- Specific granular permissions reflecting **Least Privilege** (e.g. Attendance Officer can READ attendance, CREATE hr_case, but PROHIBITED from modifying payroll or raw attendance).
- Initial AI Job Definitions (`DAILY_ATTENDANCE_REVIEW`, `LEAVE_VALIDATION`, `TRAINING_EXPIRY_CHECK`, etc.).
- Active V1 Action Items & Initial HR Case for existing factory attendance exceptions (demonstrating Case Management for real missing punches).

---

### 2. Domain Event & Case Engine Library

#### [NEW] `src/lib/events/domainEvents.ts`
Reliable database-backed event emitter:
- Function `emitDomainEvent(eventName, entityType, entityId, payload, correlationId)`
- Records to `domain_events`.

#### [NEW] `src/lib/cases/caseService.ts`
- Functions to create, update, and fetch `hr_cases`, attach evidence, add comments, and generate `action_items`.

---

### 3. API Integrations

#### [MODIFY] `src/app/api/people/leave/route.ts`
- Emit `leave.requested` when request is created.
- Emit `leave.approved` / `leave.rejected` on status updates.
- Create/update `action_items` for supervisors.

#### [MODIFY] `src/app/api/people/attendance/route.ts`
- Emit `attendance.imported` and `attendance.exception.created`.
- Auto-generate Action Items for unresolved exceptions.

#### [NEW] `src/app/api/people/cases/route.ts` & `src/app/api/people/actions/route.ts`
- REST APIs to query and manage HR cases and Action Items.

#### [NEW] `src/app/api/people/ai-workforce/route.ts`
- Read-only registry view of Digital Workers, their missions, permissions, and active versions.

---

### 4. UI Enhancements (Modular HR Command Center)

#### [NEW] `src/components/people/ActionItemsWidget.tsx`
- "What Needs Your Attention?" widget on Dashboard:
  - Pending leave approvals
  - Attendance corrections
  - Active HR cases

#### [NEW] `src/components/people/CasesManagementView.tsx`
- Dedicated tab to manage HR Cases (investigate missing punches, attendance exceptions, attach evidence, log comments).

#### [NEW] `src/components/people/AiWorkforceRegistryView.tsx`
- Clean admin tab showing the 6 registered Digital Workers, their roles, missions, permission scopes, and "Planned (Phase 8)" badges with zero fake execution.

#### [MODIFY] `src/components/people/PeopleHeader.tsx` & `src/app/(dashboard)/people/page.tsx`
- Integrate Action Items and Cases tabs.

---

### 5. Documentation Deliverables

#### [NEW] `AI_WORKFORCE_ARCHITECTURE.md`
Comprehensive blueprint covering:
- AI Agent Model (Digital Workers)
- Permission Model & Least Privilege
- Human-in-the-Loop Levels (0 to 3 + High-Risk Prohibitions)
- Case Management & Evidence Pack Architecture
- Event-Driven Architecture
- Data Privacy, Redaction Layer & Auditing

#### [NEW] `DATABASE_SCHEMA.md`
Complete ERD and table relationship documentation covering all 8 layers.

---

## Verification Plan

### Automated Verification
1. Run `node scripts/migrate_ai_workforce.js` and verify all 16 tables exist.
2. Run `node scripts/seed_ai_workforce.js` and verify 6 AI agents, permissions, sample case, and action items are seeded.
3. Run `cmd.exe /c "npm run build"` to verify 100% Next.js TypeScript compilation and routing.
4. Execute test script `node scripts/test_ai_workforce.js` verifying:
   - Domain events are written to `domain_events`.
   - Action Items can be fetched and completed.
   - HR Cases can have evidence and comments attached.
   - AI permissions block high-risk actions.

### Manual Verification
- Open `/people` in browser:
  - Check HR Manager persona: Verify Action Items ("What Needs Your Attention?") and Cases Management tab.
  - Verify AI Workforce Registry tab renders all 6 Digital Workers with clear "Planned" status.
