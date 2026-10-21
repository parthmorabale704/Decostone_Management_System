# DECOSTONE Material Management System (MMS)

[![React](https://img.shields.io/badge/React-19.x-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.21-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003B57?logo=sqlite&logoColor=white)](https://sqlite.org/)
[![JWT](https://img.shields.io/badge/JWT-Protected-000000?logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

> **Enterprise Multi-Godown Material Management & Stock Movement Platform for Tiles, Marble, Granite, Bathroom Ware, Kitchen Sinks, and Sanitary Ware.**

---

## 📑 Table of Contents

- [🏛️ System Overview](#️-system-overview)
- [🛑 Industry Problem & Solution](#-industry-problem--solution)
- [✨ Key Features & Modules](#-key-features--modules)
- [🔐 Role-Based Access Control (RBAC) Matrix](#-role-based-access-control-rbac-matrix)
- [🔑 Default Demo Credentials](#-default-demo-credentials)
- [🧮 Stock Calculation & ACID Integrity](#-stock-calculation--acid-integrity)
- [🏗️ Technical Architecture](#️-technical-architecture)
- [📊 Database Schema & Data Models](#-database-schema--data-models)
  - [Database Name and Read-Only Checks](#database-name-and-read-only-checks)
- [🛠️ Technology Stack](#️-technology-stack)
- [📂 Project Structure](#-project-structure)
- [🚀 Getting Started & Installation](#-getting-started--installation)
  - [Prerequisites](#prerequisites)
  - [1. Backend Setup](#1-backend-setup)
  - [2. Frontend Setup](#2-frontend-setup)
- [📡 REST API Documentation](#-rest-api-documentation)
- [🧪 Acceptance Test Scenarios](#-acceptance-test-scenarios)
- [🔮 Future Roadmap](#-future-roadmap)
- [📄 License & Authors](#-license--authors)

---

## 🏛️ System Overview

**DecoStone Material Management System (MMS)** is a centralized, role-governed supply chain and warehouse inventory management platform built specifically for architectural stone, tile, and sanitary ware distribution.

The platform coordinates operations across **four independent warehouses (Godown 1–4)**, guaranteeing database-level **ACID transactional consistency**, preventing negative inventory dispatches, automating minimum safety stock reorder alerts, maintaining an immutable audit ledger, and generating exportable business intelligence reports in **PDF** and **Excel (.xlsx)**.

---

## 🛑 Industry Problem & Solution

### ⚠️ Traditional Challenges in Stone & Tile Warehousing
1. **Multi-Location Dispersal**: Slabs, tiles, and fittings are physically spread across separate godowns without synchronized inventory visibility.
2. **Negative Stock & Phantom Inventory**: Manual paperwork or loosely-coupled spreadsheets allow dispatches exceeding physical stock, creating inventory discrepancies.
3. **Untracked Transfers**: Materials moved between warehouses are often recorded with lag or double-counted, distorting financial valuations.
4. **Inadequate Role Isolation**: Field warehouse supervisors often share unmanaged master accounts or lack direct, controlled access for recording receipt and dispatch.
5. **Stockouts & Delayed Procurement**: Without automated safety-stock thresholds, shortages are identified only when orders cannot be fulfilled.

### 💡 The DecoStone MMS Solution
- **Centralized Multi-Godown State**: Real-time balance ledger maintaining independent counts for each warehouse.
- **ACID Transaction Engine**: Every dispatch, receipt, adjustment, and inter-godown transfer runs inside an atomic transaction.
- **Negative Stock Prevention Guards**: Dispatches or transfers greater than available stock are rejected with explicit error messaging (`"Insufficient stock available"`).
- **Strict Role-Based Access Control**: Granular 3-tier authorization (Admin, Manager, Supervisor) enforced at both UI and API middleware levels.
- **Dynamic Low Stock Warning Center**: Real-time alerts trigger automatically whenever inventory reaches or drops below minimum thresholds.

---

## ✨ Key Features & Modules

### 1. 📊 Executive Analytics & KPI Dashboard
- Real-time KPI summary: Total Inventory Valuation, Active Material SKUs, Low Stock Count, Today's Inflow vs Outflow velocity.
- Interactive visualizations powered by **Recharts**:
  - **Godown Distribution (Donut Chart)**: Volume share across Godown 1, 2, 3, and 4.
  - **Category Volume Breakdown (Bar Chart)**: Comparative stock across Tiles, Marble, Sinks, and Sanitary Ware.
  - **Inflow vs Outflow Velocity (Area Chart)**: Daily movement trends.
- Quick-action navigation for instant receipts, dispatches, and transfers.

### 2. 🏛️ Multi-Warehouse (Godown) Management
- Dedicated views and ledgers for **Godown 1, Godown 2, Godown 3, and Godown 4**.
- Real-time status indicators: 🟢 In Stock, 🟠 Low Stock, 🔴 Out of Stock.
- Instant search and filtering by SKU, Brand, Category, and Stock Status.
- Admin capabilities to add, edit, or configure godown locations and descriptions.

### 3. 📦 Category & Material Catalog
- Hierarchical classification: **Category $\rightarrow$ Materials**.
- Rich material specifications: Name, SKU Code, Category, Brand, Unit (Boxes, Sq.Ft, Pieces, Sets), Dimensions (Size/Color), Purchase & Selling Price, Minimum Safety Stock level, and Multi-Godown Opening Stock.
- Soft-deletion safeguards preserving historical transaction auditability.

### 4. 📥 Stock IN (Receipts & Procurement)
- Capture inbound vendor shipments with Supplier Name, PO Number, and Batch Details.
- Real-time increment of targeted godown inventory balance.
- Generation of immutable transaction receipt entries.

### 5. 📤 Stock OUT (Dispatches & Sales)
- Record dispatches to contractors, retailers, and clients with Invoice & Reference numbers.
- **Hard Negative Stock Guard**: Dispatches that exceed available warehouse quantity are blocked before database execution.
- Instant reduction of physical stock and automatic update of low-stock triggers.

### 6. 🔄 Atomic Inter-Godown Transfers
- Transfer materials between any two warehouses (e.g., Godown 1 $\rightarrow$ Godown 3).
- **Two-Phase Atomic Execution**: Source deduction and destination increment happen in a single database transaction. If either fails, the entire transfer rolls back.
- Automatically generates unique tracking code formatted as `TRF-YYYY-NNNN`.
- **Conservation Invariant**: Total company-wide inventory balance remains constant throughout transfers.
- Same-godown transfer prevention guard.

### 7. ⚖️ Physical Stock Adjustments & Reconciliation
- Reconcile differences between physical warehouse counts and system balances.
- Automated variance computation (+Surplus / -Deficit).
- Mandatory audit justification (e.g., transit breakage, cutting loss, counting variance).

### 8. 🚨 Low Stock Warning Center
- Live monitoring against configured minimum safety stock thresholds.
- Dynamic filtering by warehouse and material category.
- One-click shortcuts to initiate emergency Purchase / Stock IN orders.

### 9. 📑 Multi-Format Reporting & Export Center
- Comprehensive date-range, godown-wise, and category-wise transaction filters.
- **Client-Side Export Engines**:
  - **PDF Export**: Formatted, styled tables with auto-pagination and corporate DecoStone headers via `jspdf` & `jspdf-autotable`.
  - **Excel Export**: Structured spreadsheets (`.xlsx`) via `xlsx` (SheetJS).

### 10. 🛡️ User Management & Audit Trail
- Multi-tier user administration with granular permission flags (`can_stock_in`, `can_stock_out`, `can_adjust`).
- Immutable system security and operational audit logs capturing User ID, Action, Entity, IP Address, and Timestamps.

---

## 🔐 Role-Based Access Control (RBAC) Matrix

Authorization is enforced at the **Express API middleware layer** (`authenticateToken`, `requireRole`, `requirePermission`, `checkGodownAccess`) to guarantee security against direct endpoint manipulation.

| Feature / Operation | Admin | Manager | Supervisor |
|---|:---:|:---:|:---:|
| User Management (Create, Edit, Deactivate) | ✅ Full | ❌ No | ❌ No |
| System Settings & Godown Configuration | ✅ Full | ❌ No | ❌ No |
| Category Management | ✅ Full | 👁️ View Only | ❌ No |
| Material Catalog Creation & Editing | ✅ Full | ✅ Full | ❌ No |
| Material Soft-Deletion | ✅ Full | ❌ No | ❌ No |
| Multi-Warehouse Stock Overview | ✅ All Godowns | ✅ All Godowns | 🔒 Assigned Godown |
| Stock IN (Receipt) | ✅ Yes | ✅ Yes | 🔒 Assigned Godown |
| Stock OUT (Dispatch) | ✅ Yes | ✅ Yes | 🔒 Assigned Godown |
| Inter-Godown Transfers | ✅ Yes | ✅ Yes | 👁️ View Status Only |
| Stock Adjustments & Reconciliations | ✅ Yes | 🔒 Permission Flag | ❌ No |
| Low Stock Alert Center | ✅ Yes | ✅ Yes | ❌ No |
| Reports & Multi-Format Exports | ✅ Yes | ✅ Yes | ❌ No |
| Security & System Audit Logs | ✅ Yes | ❌ No | ❌ No |

---

## 🔑 Default Demo Credentials

The system seeds with pre-configured accounts for rapid demonstration and testing.

| Role | Username | Password | Assigned Location / Access Scope |
|---|---|---|---|
| **Admin** | `admin` | `admin123` | Complete enterprise control across all Godowns |
| **Manager** | `manager` | `manager123` | Operational access across all Godowns (Stock, Transfers, Reports) |
| **Supervisor 1** | `supervisor1` | `supervisor123` | Isolated to **Godown 1** (Receipt & Dispatch only) |
| **Supervisor 2** | `supervisor2` | `supervisor123` | Isolated to **Godown 2** (Receipt & Dispatch only) |

> 💡 **Tip:** The web login screen includes **1-Click Quick Access** buttons to switch between demo roles instantly without typing credentials.

---

## 🧮 Stock Calculation & ACID Integrity

### Mathematical Universal Stock Formula

$$\text{Current Stock} = \text{Opening Stock} + \sum \text{Stock IN} - \sum \text{Stock OUT} + \sum \text{Transfers IN} - \sum \text{Transfers OUT} \pm \sum \text{Adjustments}$$

### ACID Integrity Invariants

1. **Transaction Isolation**: All inventory mutations run inside `db.transaction(...)` blocks.
2. **Non-Negative Constraint**: Database `CHECK (quantity >= 0)` combined with service-layer validation ensures inventory can never drop below zero.
3. **Transfer Invariance**: For any transfer between Godowns $A$ and $B$, $\Delta Q_A + \Delta Q_B = 0$. Total inventory remains constant.
4. **Soft Delete Preservation**: Materials with existing transactions cannot be permanently erased; the `is_deleted = 1` flag hides them from new operations while preserving financial and audit ledgers.

---

## 🏗️ Technical Architecture

DecoStone MMS utilizes a decoupled **Client-Server REST Architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                 React 19 Frontend (Vite)                    │
│   - Glassmorphism & Stone-inspired Dark/Light Design        │
│   - Recharts Visualizations & Lucide React Icons            │
│   - jsPDF + AutoTable & SheetJS (XLSX) Export Engine        │
└──────────────────────────────┬──────────────────────────────┘
                               │ JSON REST API (HTTP + Bearer JWT)
┌──────────────────────────────▼──────────────────────────────┐
│                 Node.js + Express.js API Server             │
│   - JWT Auth & Granular Role/Permission Middleware          │
│   - ACID Stock Transaction Service Layer                    │
│   - Security Request Logger & Audit Dispatcher              │
└──────────────────────────────┬──────────────────────────────┘
                               │ better-sqlite3 (WAL Mode)
┌──────────────────────────────▼──────────────────────────────┐
│                    SQLite Database Engine                   │
│   - Foreign Keys & Non-Negative Check Constraints           │
│   - WAL (Write-Ahead Logging) for High Concurrency          │
│   - Auto-Seeding & Schema Initialization on Startup         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema & Data Models

| Table Name | Primary Purpose | Key Fields |
|---|---|---|
| `users` | User credentials & role definitions | `id`, `name`, `username`, `email`, `password_hash`, `role`, `assigned_godown_id`, `can_stock_in`, `can_stock_out`, `can_adjust`, `is_active` |
| `godowns` | Warehouse details & locations | `id`, `name`, `code`, `location`, `description`, `is_active` |
| `categories` | Material classification | `id`, `name`, `description`, `image_url` |
| `materials` | Material master catalog & specifications | `id`, `sku`, `name`, `category_id`, `brand`, `size`, `color`, `unit`, `purchase_price`, `selling_price`, `min_stock_level`, `is_deleted` |
| `stock` | Live godown inventory pivot | `id`, `godown_id`, `material_id`, `quantity` *(UNIQUE godown_id + material_id)* |
| `stock_transactions` | Immutable transaction ledger | `id`, `transaction_id`, `transaction_type`, `godown_id`, `material_id`, `quantity`, `previous_stock`, `new_stock`, `user_id`, `reference_no`, `partner_name`, `reason` |
| `stock_transfers` | Inter-warehouse transfer log | `id`, `transfer_id`, `from_godown_id`, `to_godown_id`, `material_id`, `quantity`, `reason`, `status`, `user_id`, `created_at` |
| `stock_adjustments` | Physical count reconciliation log | `id`, `godown_id`, `material_id`, `system_stock`, `physical_stock`, `adjustment_quantity`, `reason`, `user_id`, `created_at` |
| `material_images` | Additional images associated with materials | `id`, `material_id`, `image_url`, `is_primary`, `created_at` |
| `audit_logs` | Security & operational history | `id`, `user_id`, `user_name`, `role`, `action`, `details`, `ip_address`, `affected_table`, `affected_id`, `created_at` |
| `system_settings` | System-wide configuration | `key`, `value`, `description`, `updated_at` |

### Database Name and Read-Only Checks

The default SQLite database name is **`decostone.db`**. Its default project path is **`backend/data/decostone.db`**. If `DATABASE_PATH` or `DATA_DIR` is set in the backend environment, the database may be stored at that configured location instead.

Open the database file with a SQLite tool such as DB Browser for SQLite, select **Execute SQL**, and run the following read-only checks. These queries inspect the database; they do not change its data.

#### 1. Confirm which database file is open

```sql
PRAGMA database_list;
```

#### 2. List all tables

```sql
SELECT name
FROM sqlite_master
WHERE type = 'table'
  AND name NOT LIKE 'sqlite_%'
ORDER BY name;
```

#### 3. View the create statements for all tables

```sql
SELECT name, sql
FROM sqlite_master
WHERE type = 'table'
  AND name NOT LIKE 'sqlite_%'
ORDER BY name;
```

#### 4. Inspect table columns

Run these individually for the tables you want to inspect:

```sql
PRAGMA table_info('users');
PRAGMA table_info('godowns');
PRAGMA table_info('categories');
PRAGMA table_info('materials');
PRAGMA table_info('material_images');
PRAGMA table_info('stock');
PRAGMA table_info('stock_transactions');
PRAGMA table_info('stock_transfers');
PRAGMA table_info('stock_adjustments');
PRAGMA table_info('audit_logs');
PRAGMA table_info('system_settings');
```

#### 5. Check database integrity

```sql
PRAGMA integrity_check;
```

Expected result: `ok`.

#### 6. Check foreign-key references

```sql
PRAGMA foreign_key_check;
```

Expected result: no rows.

#### 7. Count records in the main tables

```sql
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL SELECT 'godowns', COUNT(*) FROM godowns
UNION ALL SELECT 'categories', COUNT(*) FROM categories
UNION ALL SELECT 'materials', COUNT(*) FROM materials
UNION ALL SELECT 'material_images', COUNT(*) FROM material_images
UNION ALL SELECT 'stock', COUNT(*) FROM stock
UNION ALL SELECT 'stock_transactions', COUNT(*) FROM stock_transactions
UNION ALL SELECT 'stock_transfers', COUNT(*) FROM stock_transfers
UNION ALL SELECT 'stock_adjustments', COUNT(*) FROM stock_adjustments
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs
UNION ALL SELECT 'system_settings', COUNT(*) FROM system_settings
ORDER BY table_name;
```

#### 8. View active material balances by warehouse

```sql
SELECT
  m.sku,
  m.name AS material,
  g.name AS warehouse,
  COALESCE(s.quantity, 0) AS quantity,
  m.unit
FROM materials AS m
CROSS JOIN godowns AS g
LEFT JOIN stock AS s
  ON s.material_id = m.id
 AND s.godown_id = g.id
WHERE m.is_deleted = 0
  AND g.is_active = 1
ORDER BY m.name, g.name;
```

#### 9. Find negative stock balances

```sql
SELECT *
FROM stock
WHERE quantity < 0;
```

Expected result: no rows.

#### 10. Find duplicate material balances per warehouse

```sql
SELECT godown_id, material_id, COUNT(*) AS row_count
FROM stock
GROUP BY godown_id, material_id
HAVING COUNT(*) > 1;
```

Expected result: no rows.

#### 11. Review users and account status

```sql
SELECT id, username, role, assigned_godown_id, is_active
FROM users
ORDER BY id;
```

#### 12. Review the 50 most recent stock movements

```sql
SELECT
  st.transaction_id,
  st.transaction_type,
  m.name AS material,
  g.name AS warehouse,
  st.quantity,
  st.previous_stock,
  st.new_stock,
  st.created_at
FROM stock_transactions AS st
JOIN materials AS m ON m.id = st.material_id
JOIN godowns AS g ON g.id = st.godown_id
ORDER BY st.created_at DESC, st.id DESC
LIMIT 50;
```

These checks are read-only. Avoid running `INSERT`, `UPDATE`, `DELETE`, or schema-changing statements when you only intend to inspect the database.

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend Framework** | **React 19** | Modern functional components, custom hooks, and React Context |
| **Build Tool** | **Vite 8** | Lightning-fast HMR and optimized bundling |
| **Styling & Theme** | **Vanilla CSS** | Glassmorphism, CSS Custom Properties / Design Tokens, Dark Mode |
| **Icons** | **Lucide React** | Clean, modern SVG icon set |
| **Visualizations** | **Recharts** | Donut, Bar, and Area charts with responsive tooltips |
| **Export Engines** | **jsPDF**, **SheetJS (xlsx)** | Client-side formatted PDF generation and Excel spreadsheets |
| **Backend Framework** | **Node.js + Express 4.21** | Modular controllers, services, routes, and middleware |
| **Database** | **SQLite (better-sqlite3)** | Embedded, high-performance database with Write-Ahead Logging (WAL) |
| **Authentication** | **JWT + bcryptjs** | Secure password hashing (10 salt rounds) and Bearer token auth |

---

## 📂 Project Structure

```
ManagementSystem/
├── frontend/                             # Frontend Single Page Application
│   ├── public/                           # Static public assets
│   ├── src/
│   │   ├── assets/                       # Images, logos, branding assets
│   │   ├── components/                   # Reusable UI components
│   │   │   ├── Layout.jsx                # Shell with Sidebar & Header
│   │   │   ├── MaterialDetailModal.jsx   # Material inspection popup
│   │   │   ├── Navbar.jsx                # Top navigation & user profile
│   │   │   ├── Sidebar.jsx               # Role-aware navigation menu
│   │   │   ├── StatCard.jsx              # Metric cards with trend indicators
│   │   │   └── StockBadge.jsx            # In-Stock, Low-Stock status pills
│   │   ├── context/                      # State providers
│   │   │   ├── AuthContext.jsx           # User authentication & token state
│   │   │   ├── NotificationContext.jsx   # Global toast notifications
│   │   │   └── ThemeContext.jsx          # Dark/Light mode theme state
│   │   ├── pages/                        # Feature pages & routes
│   │   │   ├── Adjustments.jsx           # Physical stock reconciliation
│   │   │   ├── AuditLogs.jsx             # System audit & login trail
│   │   │   ├── Categories.jsx            # Category management
│   │   │   ├── Dashboard.jsx             # Analytics KPI dashboard
│   │   │   ├── Godowns.jsx               # Dedicated warehouse dashboards
│   │   │   ├── Login.jsx                 # Authentication with quick-demo buttons
│   │   │   ├── LowStock.jsx              # Low-stock warning center
│   │   │   ├── Materials.jsx             # Master material catalog
│   │   │   ├── Reports.jsx               # Report generator (PDF & Excel)
│   │   │   ├── Settings.jsx              # System settings & configuration
│   │   │   ├── StockHistory.jsx          # Transaction ledger & search
│   │   │   ├── StockIn.jsx               # Stock receipt module
│   │   │   ├── StockOut.jsx              # Stock dispatch module
│   │   │   ├── Transfers.jsx             # Inter-godown transfer module
│   │   │   └── Users.jsx                 # User management (Admin)
│   │   ├── services/
│   │   │   └── api.js                    # Axios/fetch REST API client
│   │   ├── utils/
│   │   │   ├── exportPdf.js              # jsPDF table generation
│   │   │   ├── exportExcel.js            # SheetJS workbook generation
│   │   │   └── stockEvents.js            # Real-time event bus
│   │   ├── App.jsx                       # Routing & protected route guards
│   │   ├── index.css                     # Design tokens & glassmorphism theme
│   │   └── main.jsx                      # React application entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── backend/                              # Backend REST API Server
│   ├── data/
│   │   └── decostone.db                  # SQLite database file (WAL mode)
│   ├── src/
│   │   ├── controllers/                  # Route request handlers
│   │   │   ├── auditController.js        # Audit log endpoints
│   │   │   ├── authController.js         # Login, profile, password change
│   │   │   ├── categoryController.js    # Category CRUD
│   │   │   ├── godownController.js      # Godown CRUD & warehouse inventories
│   │   │   ├── materialController.js    # Material master CRUD
│   │   │   ├── reportController.js      # Aggregate statistics & reports
│   │   │   ├── stockController.js       # In, Out, Transfer, Adjustment endpoints
│   │   │   └── userController.js        # User management & permission toggles
│   │   ├── db/
│   │   │   ├── database.js               # Database connection & schema migration
│   │   │   └── seed.js                   # Automated demo data seeder
│   │   ├── middleware/
│   │   │   └── auth.js                   # JWT verification, role & godown check
│   │   ├── routes/                       # Express router definitions
│   │   │   ├── auditRoutes.js            # /api/system
│   │   │   ├── authRoutes.js             # /api/auth
│   │   │   ├── categoryRoutes.js         # /api/categories
│   │   │   ├── godownRoutes.js           # /api/godowns
│   │   │   ├── materialRoutes.js         # /api/materials
│   │   │   ├── reportRoutes.js           # /api/reports
│   │   │   ├── stockRoutes.js            # /api/stock
│   │   │   └── userRoutes.js             # /api/users
│   │   ├── services/
│   │   │   ├── auditService.js           # Audit event logger
│   │   │   └── stockService.js           # ACID transaction stock engine
│   │   └── index.js                      # Express application entrypoint
│   └── package.json
│
├── docs/                                 # Requirements, architecture and presentation material
│   ├── requirements.md                   # Product Requirements Document
│   ├── architecture-and-project-overview.md
│   ├── presentation-guide.md
│   ├── presentation-summary.docx
│   └── tools/generate-presentation-summary.py
├── package.json                          # Root development/build commands
└── README.md                             # Documentation & Setup Guide
```

---

## 🚀 Getting Started & Installation

### Prerequisites
- **Node.js**: v20.19.0 or higher, or v22.12.0 or higher (required by Vite 8)
- **npm**: v9.0.0 or higher

---

### 1. Backend Setup

1. Open a terminal and navigate to the `backend` directory:
   ```powershell
   cd backend
   ```

2. Install dependencies:
   ```powershell
   npm install
   ```

3. Configure environment variables in `backend/.env`:
   ```env
   PORT=5000
   JWT_SECRET=replace-with-a-long-random-secret
   CLIENT_ORIGIN=http://localhost:5173
   ```
   Generate a unique secret for each deployment. Production startup fails when `JWT_SECRET` is missing. Add each trusted frontend origin to the comma-separated `CLIENT_ORIGIN` value.
   For a fresh production database, also set `BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_EMAIL`, and `BOOTSTRAP_ADMIN_PASSWORD` (at least 12 characters). Production startup creates only that administrator and rejects unchanged demo passwords.

4. Start the backend API:
   ```powershell
   npm start
   ```
   *For development with auto-reload:*
   ```powershell
   npm run dev
   ```

> ℹ️ **Database Setup:** In development, first startup initializes `data/decostone.db` with demo godowns, users, categories, materials, and stock. Production requires the bootstrap administrator environment variables and does not insert demo inventory or demo accounts.
>
> Server runs at: **`http://localhost:5000`** (Health check: `http://localhost:5000/api/health`)

---

### 2. Frontend Setup

1. Open a new terminal and navigate to the `frontend` directory:
   ```powershell
   cd frontend
   ```

2. Install dependencies:
   ```powershell
   npm install
   ```

3. Start the Vite development server:
   ```powershell
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

---

## 📡 REST API Documentation

All protected endpoints require the HTTP Authorization header:
`Authorization: Bearer <JWT_TOKEN>`

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticates user; returns JWT token & user profile |
| `GET` | `/api/auth/profile` | Authenticated | Fetches current user profile |
| `POST` | `/api/auth/change-password` | Authenticated | Changes current user password |

### 🏛️ Warehouses (`/api/godowns`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/godowns` | Authenticated | Lists all godowns with total materials & stock counts |
| `GET` | `/api/godowns/:id` | Authenticated | Warehouse details, full material inventory & stats |
| `POST` | `/api/godowns` | Admin | Creates a new warehouse |
| `PUT` | `/api/godowns/:id` | Admin | Updates warehouse name, location, or code |

### 📦 Categories (`/api/categories`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/categories` | Authenticated | Lists all categories with total materials count |
| `POST` | `/api/categories` | Admin | Adds a new material category |
| `PUT` | `/api/categories/:id` | Admin | Updates category details |
| `DELETE` | `/api/categories/:id` | Admin | Deletes a category (if not linked to active materials) |

### 🧱 Materials (`/api/materials`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/materials` | Authenticated | Lists active materials with godown-wise stock breakdowns |
| `GET` | `/api/materials/:id` | Authenticated | Detailed material information with transactions |
| `POST` | `/api/materials` | Admin, Manager | Creates a new material with multi-godown opening stock |
| `PUT` | `/api/materials/:id` | Admin, Manager | Updates material specifications and prices |
| `DELETE` | `/api/materials/:id` | Admin | Soft-deletes material (`is_deleted = 1`) |

### 🔄 Stock Operations (`/api/stock`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/stock/in` | `can_stock_in` | Records incoming stock from supplier |
| `POST` | `/api/stock/out` | `can_stock_out` | Dispatches stock with negative stock guard |
| `POST` | `/api/stock/transfer` | Admin, Manager | Executes atomic inter-godown transfer (`TRF-YYYY-NNNN`) |
| `POST` | `/api/stock/adjust` | `can_adjust` | Reconciles physical stock with reason |
| `GET` | `/api/stock/transactions` | Authenticated | Query transaction history with filters |
| `GET` | `/api/stock/transfers` | Authenticated | Query inter-godown transfer records |
| `GET` | `/api/stock/adjustments` | Authenticated | Query stock adjustment audit log |
| `GET` | `/api/stock/low-stock` | Authenticated | Returns items at or below minimum safety stock |

### 📊 Reports & Analytics (`/api/reports`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/reports/dashboard-summary` | Authenticated | KPI metrics, stock distribution & velocity |
| `GET` | `/api/reports/godown-wise` | Admin, Manager | Warehouse valuation and balance report |
| `GET` | `/api/reports/category-wise` | Admin, Manager | Category inventory valuation and breakdown |
| `GET` | `/api/reports/material-movement` | Admin, Manager | Velocity report (Inflow vs Outflow over time) |
| `GET` | `/api/reports/user-activity` | Admin | Staff transaction performance & audit summary |

### 👥 User Administration (`/api/users`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/users` | Admin | Lists all user accounts with roles & permissions |
| `POST` | `/api/users` | Admin | Onboards a new user with godown/role permissions |
| `PUT` | `/api/users/:id` | Admin | Updates user information and permission flags |
| `PATCH`| `/api/users/:id/toggle-status` | Admin | Activates or deactivates a user account |
| `DELETE`| `/api/users/:id` | Admin | Removes a user account |

### 📜 System & Audit (`/api/system`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/system/logs` | Admin | Paginated security and operational audit logs |
| `GET` | `/api/system/settings` | Authenticated | System configuration settings |
| `PUT` | `/api/system/settings` | Admin | Updates system preferences |

---

## 🧪 Acceptance Test Scenarios

The codebase is verified against the following real-world acceptance criteria:

1. **Opening Stock & Material Initialization**:
   - Creating a material with opening balances across Godown 1 (100), Godown 2 (50), Godown 3 (30), Godown 4 (20) yields total company stock of 200 boxes.
2. **Atomic Inter-Godown Relocation**:
   - Transferring 30 boxes from Godown 1 to Godown 3 executes atomically with unique ID `TRF-YYYY-NNNN`.
   - Godown 1 drops to 70; Godown 3 increases to 60. Overall company stock remains exactly 200.
3. **Negative Stock Guard**:
   - Attempting a Stock OUT of 9,999 boxes from Godown 3 is blocked with `"Insufficient stock available."`. Database quantity remains unmodified.
4. **Cross-Godown Transfer Guard**:
   - Attempting to transfer stock from Godown 1 to Godown 1 is immediately rejected.
5. **Backend RBAC Enforcement**:
   - A Supervisor making direct API requests to `/api/users` or `/api/system/logs` receives `403 Forbidden`.
6. **Dynamic Low-Stock Trigger**:
   - When stock drops $\le$ minimum safety stock level, the material automatically surfaces in the Low Stock Center and triggers dashboard indicator badges.
7. **Document Generation**:
   - Clicking **Export PDF** or **Export Excel** generates formatted, client-side downloadable reports matching current filters.

---

## 🔮 Future Roadmap

- [ ] **Mobile Barcode & QR Code Scanning**: Camera-based pallet scanning for high-velocity dispatch and receipt.
- [ ] **B2B Vendor & Client Portal**: External portal for suppliers to acknowledge POs and customers to track dispatches.
- [ ] **Automated Reordering System**: Automatic PO generation when stock reaches critical safety thresholds.
- [ ] **Regional Multi-Branch Expansion**: Support for multi-city warehouse networks.

---

## 📄 License & Authors

- **Project**: DecoStone Material Management System (MMS)
- **License**: ISC License
- **Target Domain**: Architectural Stone, Tiles, Granite, Bathroom Ware & Sanitary Ware Supply Chain

---

*For comprehensive presentation notes, slide-by-slide guide, and oral exam/defense prep, refer to [docs/presentation-guide.md](docs/presentation-guide.md).*
