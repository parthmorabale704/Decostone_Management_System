# DECOSTONE Material Management System (MMS)
## Comprehensive Project Explanation, Technical Documentation & Presentation Summary

---

## 📑 Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Problem Statement & Background](#2-problem-statement--background)
3. [Project Objectives & Scope](#3-project-objectives--scope)
4. [System Architecture & Technology Stack](#4-system-architecture--technology-stack)
5. [Core Modules & Functional Highlights](#5-core-modules--functional-highlights)
6. [Stock Calculation & Data Integrity Logic](#6-stock-calculation--data-integrity-logic)
7. [Role-Based Access Control (RBAC) Matrix](#7-role-based-access-control-rbac-matrix)
8. [Database Schema & Data Relationships](#8-database-schema--data-relationships)
9. [UI/UX & Design System](#9-uiux--design-system)
10. [Slide-by-Slide Presentation Guide](#10-slide-by-slide-presentation-guide)
11. [Live Demonstration & Testing Workflow](#11-live-demonstration--testing-workflow)
12. [Future Enhancements & Scalability](#12-future-enhancements--scalability)

---

## 1. Executive Summary

**DECOSTONE Material Management System (MMS)** is an enterprise-grade, web-based inventory and supply chain management platform specifically tailored for companies dealing with architectural stone, tiles, marble, granite, kitchen sinks, and sanitary ware.

The system centralizes multi-warehouse stock operations across four dedicated warehouses (**Godown 1 to 4**), maintaining independent real-time balances, enforcing database-level **ACID transactional consistency**, providing automated **low-stock warning triggers**, and recording an immutable **audit trail** for regulatory and administrative tracking.

---

## 2. Problem Statement & Background

### 🛑 Traditional Warehouse Challenges in Stone & Tile Industry:
- **Dispersed Inventory**: Materials are stored across multiple physical warehouses without real-time cross-visibility.
- **Stock Discrepancies & Human Error**: Manual paper ledgers or basic spreadsheets lead to accidental negative balances, phantom stock, and double-booking.
- **Unreliable Inter-Warehouse Transfers**: Material relocated between warehouses often goes unaccounted or creates duplicate records.
- **Lack of Granular Role Separation**: Warehouse supervisors often have unrestricted access or no access at all, leading to security and tracking risks.
- **Delayed Reorder Decisions**: Lack of automated minimum-threshold alerts results in project delays and stockouts.

### 💡 The DecoStone MMS Solution:
A unified, role-governed web application where every stock movement (Receipt, Dispatch, Transfer, Adjustment) is atomically committed to the database, instantly updating warehouse dashboards and analytical charts.

---

## 3. Project Objectives & Scope

| Objective | Description |
|---|---|
| **Multi-Godown Live Tracking** | Real-time independent stock balances for Godown 1, 2, 3, and 4. |
| **Atomic Inter-Godown Transfers** | Inter-warehouse movements executed in a single transaction with unique `TRF-YYYY-NNNN` tracking IDs. |
| **Negative Stock Prevention** | Strict database and API guards preventing dispatches exceeding available physical stock. |
| **Comprehensive Role Hierarchy** | Multi-tier RBAC for **Admin**, **Manager**, and **Supervisor** roles. |
| **Automated Alerts & Reports** | Dynamic Low Stock Alert Center and exportable reports in **PDF** and **Excel (.xlsx)**. |
| **Auditability & Traceability** | Immutable historical logging of all stock adjustments, logins, and system changes. |

---

## 4. System Architecture & Technology Stack

The project follows a decoupled **Client-Server REST Architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                    React 19 Frontend (Vite)                 │
│   - Glassmorphism & Stone-inspired Dark/Light Theme         │
│   - Recharts Visualizations, Lucide Icons                   │
│   - jsPDF + AutoTable & SheetJS (XLSX) Export Engine        │
└──────────────────────────────┬──────────────────────────────┘
                               │ JSON REST API (HTTP/JWT)
┌──────────────────────────────▼──────────────────────────────┐
│                  Node.js + Express.js Server                │
│   - JWT Auth & Role-Based Middleware                        │
│   - ACID Stock Transaction Service Layer                    │
│   - Audit Logging & Rate-Limiting / Security Guards         │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQLite Engine (WAL Mode)
┌──────────────────────────────▼──────────────────────────────┐
│                    Embedded SQLite Database                 │
│   - Foreign Key Constraints & Check Constraints             │
│   - Atomic Transactions (Rollback on failure)               │
└─────────────────────────────────────────────────────────────┘
```

### 🛠️ Technology Stack Details:
- **Frontend**: React 19, Vite, Vanilla CSS (Design Tokens, Glassmorphism, Responsive Grid), Lucide React Icons.
- **Data Visualization**: Recharts (Pie Charts, Bar Charts, Area Velocity Charts).
- **Reporting Engine**: `jspdf`, `jspdf-autotable`, `xlsx` (SheetJS).
- **Backend**: Node.js, Express.js REST API.
- **Security & Auth**: JSON Web Tokens (JWT), `bcryptjs` password hashing, role-isolation middleware.
- **Database**: SQLite (`better-sqlite3`) with Write-Ahead Logging (WAL) enabled for concurrency and performance.

---

## 5. Core Modules & Functional Highlights

### 1. 📊 Executive Dashboard & Analytics
- Dynamic KPI counters: Total Stock Value, Categories, Active Materials, Low Stock Count, Today's In/Out.
- Interactive visualizations: Godown distribution (Pie), Inflow vs Outflow velocity (Bar/Area), Category-wise volume breakdown.
- Quick navigation shortcuts to critical operational tasks.

### 2. 🏛️ Warehouse (Godown) Management
- Independent stock ledger for Godown 1, Godown 2, Godown 3, and Godown 4.
- Dedicated warehouse views with isolated inventory tables, stock status indicators (🟢 In Stock, 🟠 Low Stock, 🔴 Out of Stock), and instant transaction logs.

### 3. 📦 Category & Material Management
- Dynamic hierarchy: Category $\rightarrow$ Materials.
- Rich material properties: Material Name, SKU/Code, Category, Brand, Unit (Box, Sq.Ft, Piece), Dimensions (Size/Color), Purchase/Selling Price, Minimum Safety Stock, and Multi-godown Opening Stock.
- Search and filtering by SKU, Brand, Category, and Godown.

### 4. 📥 Stock IN (Receipts / Purchases)
- Records incoming material from vendors/suppliers with Purchase Order (PO) references.
- Instantly increments the assigned warehouse inventory and logs transaction metadata.

### 5. 📤 Stock OUT (Dispatches / Sales)
- Records dispatches to clients/contractors with Invoice & Reference numbers.
- Automated guard checking: Dispatches that exceed available warehouse balance are immediately rejected with `"Insufficient stock available."`.

### 6. 🔄 Inter-Godown Transfer Module
- Moves physical stock between Godowns (e.g., Godown 1 $\rightarrow$ Godown 3).
- **Single-Transaction Execution**: Source deduction and destination increment happen simultaneously. If any step fails, the entire transaction rolls back.
- Automatically generates unique tracking code formatted as `TRF-YYYY-NNNN`.
- Overall company inventory remains constant throughout transfer operations.

### 7. ⚖️ Physical Stock Adjustment & Reconciliation
- Reconciles differences between physical warehouse counting and digital system stock.
- Automated variance computation (Surplus / Deficit) with mandatory audit reasoning (e.g., transit damage, breakage, counting difference).

### 8. 🚨 Low Stock Warning Center
- Monitors inventory against pre-configured safety thresholds.
- Instant visual alerts with 1-click shortcut to create Purchase / Stock IN orders.

### 9. 📑 Multi-Format Reporting & Export Center
- Filterable reports across Date Ranges, Godowns, Categories, and Transaction Types.
- One-click client-side export to formatted **PDF** documents and raw **Excel (.xlsx)** spreadsheets.

### 10. 🛡️ User Management & Audit Trail
- User onboarding with role assignment (Admin, Manager, Supervisor) and Godown assignment.
- Immutable security and operational audit logs capturing timestamps, user identities, affected items, and IP details.

---

## 6. Stock Calculation & Data Integrity Logic

### 🧮 Universal Stock Formula:
$$\text{Current Stock} = \text{Opening Stock} + \text{Stock IN} - \text{Stock OUT} + \text{Transfers IN} - \text{Transfers OUT} \pm \text{Adjustments}$$

### 🔒 ACID Integrity Rules:
1. **Row-Level Consistency**: All stock modifications are wrapped in database transactions (`db.transaction(...)`).
2. **Negative Stock Guard**: Database `CHECK (quantity >= 0)` constraint paired with API-level validation prevents negative inventory.
3. **Transfer Invariance**: Deducting from Godown A and adding to Godown B is atomic; no phantom stock can be created.
4. **Soft Delete Protection**: Material records cannot be hard deleted if historical transactions exist; soft-delete flag preserves audit history.

---

## 7. Role-Based Access Control (RBAC) Matrix

| Feature / Operation | Admin | Manager | Supervisor |
|---|:---:|:---:|:---:|
| User Management & Role Creation | ✅ Full | ❌ No | ❌ No |
| System Settings & Godown Renaming | ✅ Full | ❌ No | ❌ No |
| Category Creation & Configuration | ✅ Full | 👁️ View Only | ❌ No |
| Material Addition & Catalog Editing | ✅ Full | ✅ Full | ❌ No |
| Material Soft-Deletion | ✅ Full | ❌ No | ❌ No |
| Multi-Warehouse Stock Overview | ✅ All Godowns | ✅ All Godowns | 🔒 Assigned Godown |
| Stock IN (Receipt) | ✅ Yes | ✅ Yes | 🔒 If Assigned |
| Stock OUT (Dispatch) | ✅ Yes | ✅ Yes | 🔒 If Assigned |
| Inter-Godown Transfers | ✅ Yes | ✅ Yes | 👁️ View Status Only |
| Stock Adjustment & Variance Audit | ✅ Yes | 🔒 Authorized Only | ❌ No |
| Low Stock Alert Management | ✅ Yes | ✅ Yes | ❌ No |
| Report Generation & Excel/PDF Export | ✅ Yes | ✅ Yes | ❌ No |
| Security & Operational Audit Logs | ✅ Yes | ❌ No | ❌ No |

---

## 8. Database Schema & Data Relationships

### Core Entities:
- **`users`**: User credentials, role (`admin`, `manager`, `supervisor`), assigned warehouse ID, active status.
- **`godowns`**: Warehouse identifiers, names, location details, capacities.
- **`categories`**: Material categories (Tiles, Marble, Sanitary, Granite, etc.).
- **`materials`**: SKU, name, dimensions, brand, category foreign key, safety threshold, pricing.
- **`stock`**: Pivot relation tracking `material_id`, `godown_id`, and `quantity`.
- **`stock_transactions`**: Ledger entries recording type (`IN`, `OUT`, `TRANSFER_IN`, `TRANSFER_OUT`, `ADJUSTMENT`), reference IDs, quantities, timestamps, and user IDs.
- **`stock_transfers`**: Records of inter-warehouse transfers (`from_godown`, `to_godown`, tracking code `TRF-YYYY-NNNN`).
- **`stock_adjustments`**: Reconciliation history recording previous count, physical count, difference, and justification.
- **`audit_logs`**: System security logs recording authentication, configuration, and structural modifications.

---

## 9. UI/UX & Design System

- **Architectural Aesthetic**: Slate, charcoal, and warm marble stone tones paired with modern frosted-glass glassmorphism.
- **Dynamic Feedback**: Real-time toast notifications, animated status badges, and interactive Recharts tooltips.
- **Desktop-First & Responsive**: Full responsiveness for desktop terminals, tablets, and field mobile devices.
- **Frictionless Demo Login**: One-click demo login buttons for instant role switching during presentations.

---

## 10. Slide-by-Slide Presentation Guide

Use this outline when presenting with PowerPoint, Google Slides, or during a project defense:

| Slide # | Slide Title | Key Talking Points |
|---|---|---|
| **Slide 1** | **Title & Introduction** | Project Title: DecoStone Material Management System.<br>Presenter Name & Role.<br>Enterprise-grade inventory control for stone & sanitary ware. |
| **Slide 2** | **Industry Problem Statement** | Multi-warehouse tracking challenges.<br>Manual spreadsheet errors, lack of transfer traceability, risk of negative stock. |
| **Slide 3** | **Proposed Solution** | Centralized web platform with 4 independent warehouses.<br>ACID transaction engine, real-time analytics, automated alerts. |
| **Slide 4** | **System Architecture & Tech Stack** | React 19 + Vite frontend, Express.js REST API, SQLite WAL Mode.<br>Role-based security via JWT and bcrypt. |
| **Slide 5** | **Core Modules Overview** | Godowns 1–4, Categories & Catalog, Stock In/Out, Inter-Godown Transfers, Low-Stock Warning Center. |
| **Slide 6** | **Atomic Inter-Godown Transfers** | Atomic deduction & addition in a single transaction.<br>Unique tracking ID (`TRF-2026-XXXX`). Invariant total company stock. |
| **Slide 7** | **Data Integrity & Negative Stock Guard** | Mathematical stock formula.<br>Database-level negative balance prevention with instant validation errors. |
| **Slide 8** | **Role-Based Access Control (RBAC)** | 3 Tiers: Admin, Manager, Supervisor.<br>Backend middleware enforcement (403 Forbidden on direct endpoint tampering). |
| **Slide 9** | **Analytics & Reporting Engine** | Real-time Recharts dashboards.<br>Client-side 1-click PDF & Excel (.xlsx) export. |
| **Slide 10** | **Live Demonstration** | Walkthrough of Admin Dashboard $\rightarrow$ Stock IN $\rightarrow$ Inter-Godown Transfer $\rightarrow$ Low Stock Alert $\rightarrow$ PDF Report. |
| **Slide 11** | **Key Strengths & Scalability** | Zero third-party cloud lock-in, low memory footprint, easily scalable to $N$ godowns and thousands of SKUs. |
| **Slide 12** | **Q&A / Conclusion** | Summary of business impact, thank audience, invite questions. |

---

## 11. Live Demonstration & Testing Workflow

Follow this sequence during a live demo or presentation:

1. **Login & Role Showcase**:
   - Log in as **Admin** (`admin` / `admin123`) $\rightarrow$ Highlight overall system analytics and multi-warehouse breakdown.
2. **Catalog & Material Inspection**:
   - Open **Categories & Materials** $\rightarrow$ Show SKU codes, dimensions (600x600 mm), units, and initial stock across Godown 1 to 4.
3. **Stock IN Operation**:
   - Execute a Stock IN of 50 boxes for Godown 1 $\rightarrow$ Show instant stock balance increase and updated transaction history.
4. **Inter-Godown Transfer Demonstration**:
   - Transfer 20 boxes from **Godown 1** to **Godown 2**.
   - Show generation of `TRF-YYYY-NNNN` tracking number.
   - Verify Godown 1 decreased by 20, Godown 2 increased by 20, and overall stock remained exact.
5. **Negative Stock Guard Verification**:
   - Attempt a Stock OUT of 9,999 boxes from Godown 3.
   - Show graceful UI error: `"Insufficient stock available."`
6. **Low Stock Alert & Reconciliation**:
   - View **Low Stock Center** highlighting materials below minimum threshold.
   - Demonstrate Stock Adjustment reconciliation with variance audit reason.
7. **Export Generation**:
   - Navigate to **Reports** $\rightarrow$ Click **Export PDF** and **Export Excel** $\rightarrow$ Open the generated files to show formatted output.
8. **Role Switching Demonstration**:
   - Switch to **Supervisor 1** account $\rightarrow$ Show restricted warehouse access isolated to Godown 1 only.

---

## 12. Future Enhancements & Scalability

- **Barcode / QR Code Generation & Mobile Scanning**: Direct scanning of pallet codes using mobile camera scanners.
- **Supplier & B2B Customer Portal**: External access for suppliers to acknowledge POs and customers to track dispatch manifests.
- **Automated Reordering System**: Automatic generation of supplier purchase orders when inventory hits critical safety stock.
- **Multi-Branch & Regional Expansion**: Scaling from 4 godowns to regional warehouse hubs across multiple cities.

---
*Document prepared for DecoStone Material Management System presentation, technical evaluation, and academic/enterprise project defense.*
