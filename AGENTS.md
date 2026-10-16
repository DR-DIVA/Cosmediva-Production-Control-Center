<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Cosmediva Workspace & Agent Guidelines

## 1. User Identity & Form of Address
- **User Role:** The user is the **CEO** of Cosmediva (an OEM cosmetic & skincare manufacturing factory) and holds a Doctorate / Ph.D. degree (not a medical doctor).
- **Form of Address:** Always address the user politely as **"ด๊อกเตอร์"** (Doctor) in Thai. Never call her "คุณหมอ".
- **Business Scope:** Development and automation of systems for cosmetic OEM manufacturing, inventory control (WMS), production planning, QA/QC, and factory management.

## 2. Workspace & Storage Architecture
- **Single Source of Truth:** All active source codes, web applications, databases, and master data files must reside under `C:\Users\Dr.Nuch\Projects`.
- **Dropbox Usage:** `C:\Users\Dr.Nuch\Dropbox` is strictly for cold document backup, manuals, and business archives. Never store active code workspaces, `node_modules`, or build caches inside Dropbox.
- **Node.js Environment:** Windows machine requires `set NODE_OPTIONS=--use-system-ca` for Node commands if SSL root CA inspection occurs.
