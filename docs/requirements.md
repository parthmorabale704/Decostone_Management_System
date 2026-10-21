# Product Requirements Document (PRD)
## DecoStone Material Management System

| Field | Detail |
|---|---|
| Product | DecoStone Material Management System |
| Company | DecoStone |
| Document type | Product Requirements Document |
| Version | 1.0 (Draft) |
| Date | 03 October 2026 |
| Platform | Web application (desktop-first, mobile-friendly) |

---

## 1. Overview

### 1.1 Purpose
DecoStone needs one centralized system to manage all materials across four godowns (warehouses) with accurate, real-time stock movement. The system automatically updates stock whenever material is added, removed, sold, purchased, adjusted, or transferred between godowns.

### 1.2 Vision
> "One centralized system to manage all DecoStone materials across four godowns with accurate real-time stock movement."

### 1.3 Business Context
DecoStone deals in tiles, marble, bathroom ware, kitchen sinks, sanitary ware, and other materials. Categories and material names must be fully customizable by the company rather than fixed.

### 1.4 Goals
1. Maintain independent, accurate stock per godown.
2. Eliminate manual stock errors via automatic calculation and database-level safeguards.
3. Provide a full audit trail of every stock change and key action.
4. Give role-appropriate access to Admin, Manager, and Supervisor.
5. Provide dashboards, alerts, and exportable reports for decision-making.
6. Be scalable: more godowns, categories, materials, and users can be added without changing the core architecture.

### 1.5 Non-Goals (Out of Scope for v1)
- Accounting, invoicing, or payment processing
- Supplier/customer portals
- Barcode/QR scanning hardware integration
- Native mobile apps (responsive web only)

### 1.6 Target Users
| Role | Description |
|---|---|
| Admin | Owner/system controller with complete access |
| Manager | Operational lead handling stock, transfers, and reports |
| Supervisor | Godown-level staff with limited, assigned-godown access |

---

## 2. User Roles & Permissions

### 2.1 Permission Matrix

| Capability | Admin | Manager | Supervisor |
|---|:---:|:---:|:---:|
| Add/edit/delete users | ✅ | ❌ | ❌ |
| Manage Admin accounts | ✅ | ❌ | ❌ |
| Change system settings / rename godowns | ✅ | ❌ | ❌ |
| Create/manage categories | ✅ | ❌ (view) | ❌ |
| Add material | ✅ | ✅ | ❌ |
| Update material info | ✅ | ✅ | ❌ |
| Delete material | ✅ | ❌ | ❌ |
| View stock (all godowns) | ✅ | ✅ (assigned/all) | Assigned godown only |
| Stock IN | ✅ | ✅ | If permission enabled |
| Stock OUT | ✅ | ✅ | If permission enabled |
| Transfer material | ✅ | ✅ | ❌ (view status only) |
| Stock adjustment | ✅ | Authorized managers | ❌ |
| View stock history | ✅ | ✅ | Basic only |
| View reports | ✅ | ✅ | ❌ |
| Low-stock alerts | ✅ | ✅ | ❌ |
| Search materials / view details | ✅ | ✅ | ✅ |
| View audit logs | ✅ | ❌ | ❌ |

### 2.2 Authorization Rule
Authorization **must be enforced on the backend/API**, not only by hiding frontend buttons. Every endpoint validates the JWT and the user's role (and assigned godown where applicable).

---

## 3. Functional Requirements

### FR-1 Authentication & Login
- Login page branded **DECOSTONE**, title "Material Management System".
- Fields: Username/Email, Password.
- JWT-based authentication; passwords hashed with bcrypt or Argon2.
- Role-based redirect: Admin → Admin Dashboard, Manager → Manager Dashboard, Supervisor → Supervisor Dashboard.
- Deactivated users cannot log in.
- Login events recorded in the audit log.

### FR-2 Godown Management
- Four godowns at launch: Godown 1, 2, 3, 4.
- Admin can rename godowns.
- Each godown maintains independent stock per material.
- Architecture must allow adding more godowns later.

**Example:** 600×600 Tile → G1: 100, G2: 50, G3: 75, G4: 25 → Total: 250 boxes.

### FR-3 Category Management
- Prominent **"+ Add Category"** button opening a page/modal.
- Fields: Category Name, Description, Category Image.
- Categories displayed as professional cards (e.g., Tiles, Marble, Bathroom Ware, Kitchen Sinks, custom).
- Unlimited custom categories (Admin).

### FR-4 Material Management
- **"+ Add Material"** button inside each category.
- Fields: Material Name, SKU/Code (unique), Category, Brand, Description, Image, Size, Color, Unit, Purchase Price, Selling Price, Minimum Stock Level, Opening Stock, Godown Location.
- Supports multiple images (`material_images`).
- Edit and delete (delete: Admin only; soft-delete recommended to preserve history).

**Example:** Category: Tiles · Material: Royal White Glossy Tile · Code: TIL-001 · Size: 600×600 mm · Unit: Box.

### FR-5 Stock Calculation
**Formula:**
`Stock = Opening Stock + Stock IN − Stock OUT + Transfers IN − Transfers OUT (± Adjustments)`

- All stock values come from the database; nothing hard-coded.
- Each godown/material combination has its own stock record.

### FR-6 Stock IN
Fields: Godown, Material, Quantity, Supplier, Purchase/Reference No., Date, Remarks, Added By (auto).
Result: godown stock increases; history entry created.

### FR-7 Stock OUT
Fields: Godown, Material, Quantity, Customer/Reason, Invoice/Reference No., Date, Remarks, Removed By (auto).
Rules: stock may never go negative. Show error **"Insufficient stock available."**

### FR-8 Material Transfer
Fields: From Godown, To Godown, Material, Quantity, Reason (optional), Transfer Date (auto), Transferred By (auto).
- Unique transfer ID per transfer, format **TRF-YYYY-NNNN** (e.g., TRF-2026-0001).
- Source decreases and destination increases **in a single database transaction**; failure rolls back both.
- Total company stock remains unchanged by a transfer; no duplicate stock may be created.

**Example:** G1 100 → transfer 20 to G2 (50) → G1 = 80, G2 = 70.

### FR-9 Stock Adjustment
- For Admin / authorized Manager.
- Inputs: System Stock, Physical Stock, computed Adjustment, Reason (damage, counting difference, etc.).
- Saved to adjustment records and stock history; also appears in reports.

### FR-10 Stock History (Audit Trail)
Every stock change is recorded.

Transaction types: Stock IN, Stock OUT, Transfer IN, Transfer OUT, Stock Adjustment.

Stored fields: Transaction ID, Date & Time, Material, Category, Godown, Quantity, Type, Previous Stock, New Stock, User, Remarks.

### FR-11 Dashboard
**Summary cards:** Total Materials, Total Categories, Total Stock, Godown 1–4 Stock, Low Stock Items, Today's Stock IN, Today's Stock OUT, Today's Transfers.

**Charts:** Stock by Godown, Category-wise Stock, Stock IN vs OUT, Monthly Material Movement, Low Stock Materials.

### FR-12 Godown Dashboard
Shows: Godown Name, Total Materials, Total Quantity, Low Stock Items, Recent Stock IN/OUT/Transfers, and a material table:

| Material | Category | SKU | Quantity | Unit | Minimum Stock | Status |
|---|---|---|---|---|---|---|

Status (automatic): 🟢 In Stock · 🟠 Low Stock (qty ≤ minimum) · 🔴 Out of Stock (qty = 0).

### FR-13 Search & Filters
- Search by: material name, code, category, brand, godown.
- Filters: godown, category, stock status, brand, material type.

### FR-14 Material Details Page
Displays image, name, code, category, brand, description, size, color, unit, purchase/selling price, minimum stock, current stock, godown-wise stock breakdown with total, and a **Stock Movement History** table (Date, Type, Godown, Quantity, User).

### FR-15 Low Stock Alerts
- Visible to Admin and Manager on the dashboard.
- Alert shows Material, Godown, Current Stock, Minimum Stock.

### FR-16 Reports
Reports: Godown-wise Stock, Category-wise Stock, Material Stock, Stock IN, Stock OUT, Transfer, Low Stock, Stock Adjustment, User Activity.
Output: view online, print, export to **PDF**, export to **Excel**.

### FR-17 User Management (Admin)
Fields: Name, Username, Email, Mobile, Password, Role, Assigned Godown, Status.
Admin can add/edit/delete and activate/deactivate users.

### FR-18 Notifications
Toast/in-app notifications for: low stock, successful transfer, Stock IN, Stock OUT, failed transaction, new user, stock adjustment.
Example: "✅ Transfer completed successfully. 20 Boxes transferred from Godown 1 to Godown 2."

### FR-19 Audit Log
Records: User Login, Material Added/Updated/Deleted, Category Created, Stock Added/Removed, Material Transferred, Stock Adjusted, User Created/Deactivated.
Each entry: User, Action, Date, Time, IP/device info (if available), Affected record.

---

## 4. Stock Integrity Rules (Critical)

For every transaction the backend must:
1. Read current stock (with row lock).
2. Validate quantity.
3. Calculate new stock.
4. Update stock.
5. Create transaction history.
6. Save user information.
7. Save date/time.
8. For transfers, update **both** godowns inside the same DB transaction.

**Never allow:** negative stock, duplicate transfers, invalid godown, invalid material, transfer to the same godown.

Additional safeguards: quantity must be a positive number; idempotency/duplicate-submit protection on transfer; DB `CHECK (quantity >= 0)` constraint.

---

## 5. Navigation & UI Requirements

### 5.1 Sidebar (role-filtered)
Dashboard · Godowns (Godown 1–4) · Categories · Materials · Stock IN · Stock OUT · Transfer Material · Stock History · Low Stock · Reports · Users · Settings · Logout

### 5.2 Design Principles
- Modern, clean, premium, professional, responsive (desktop-first).
- Branding inspired by stone, marble, and architectural materials; restrained palette, not overly colorful.
- Components: sidebar, top bar, dashboard cards, tables, modal forms, search bars, filters, charts, material cards, godown cards, status badges, confirmation dialogs, toast notifications.

---

## 6. Technical Requirements

### 6.1 Stack
| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| UI | Tailwind CSS |
| Icons | Lucide React |
| Charts | Recharts or Chart.js |
| Backend | Node.js + Express.js (REST API) |
| Database | PostgreSQL or MySQL |
| Auth | JWT + bcrypt/Argon2 |

### 6.2 Database Schema (Suggested Tables)
`users`, `roles`, `godowns`, `categories`, `materials`, `material_images`, `stock`, `stock_transactions`, `stock_transfers`, `stock_adjustments`, `suppliers`, `customers`, `audit_logs`

**Key relationships:**
- One Category → Many Materials
- One Material → Stock rows in multiple Godowns
- One Godown → Many Materials (via stock)
- One Material → Many Stock Transactions

### 6.3 Code Quality
- Modular structure (routes / controllers / services / models / middleware) that diploma students can understand and maintain.
- Stock logic centralized in a service layer.

### 6.4 Suggested Project Structure
```
decostone/
├── frontend/              # React + Vite
│   └── src/ (components, pages, layouts, hooks, services, context)
├── backend/               # Express API
│   └── src/ (routes, controllers, services, models, middleware, config)
├── database/              # schema.sql, seed.sql, migrations
└── README.md              # setup instructions
```

---

## 7. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Security | Hashed passwords, JWT expiry, backend RBAC, input validation, SQL-injection and XSS protection |
| Data integrity | ACID transactions for all stock operations |
| Performance | List pages paginated; dashboard queries indexed and responsive |
| Scalability | Godowns, categories, materials, and users extensible without core changes |
| Usability | Responsive layout, clear error messages, confirmation dialogs for destructive actions |
| Auditability | Immutable stock history; all key actions logged |
| Maintainability | Modular, documented code with setup instructions |

---

## 8. Acceptance Criteria / Sample Workflow

1. Admin creates category **Tiles** and material **Royal White Glossy Tile** with opening stock G1=100, G2=50, G3=30, G4=20 (Total 200).
2. Manager transfers **30 boxes** G1 → G3. Result: G1=70, G3=60, total still **200**.
3. Supervisor records **Stock OUT 10 boxes** from G3. Result: G3=50, total **190**.
4. Every step appears in Stock History with previous/new stock, user, and timestamp.
5. Attempting Stock OUT greater than available shows "Insufficient stock available." and changes nothing.
6. Attempting transfer to the same godown is rejected.
7. A Supervisor calling an Admin-only API directly receives a 403 response.
8. Low-stock alert appears on the dashboard when quantity ≤ minimum level.
9. Reports export successfully to PDF and Excel.

---

## 9. Deliverables
- Complete project structure
- Database schema (+ seed data)
- Frontend pages
- Backend REST APIs
- Authentication system
- Role permissions
- Stock calculation logic
- Setup instructions (README)

---

## 10. Open Questions / Assumptions
- Is Supervisor Stock IN/OUT permission a per-user toggle? (Assumed: yes, set by Admin.)
- Should Managers be restricted to assigned godowns or see all? (Assumed: configurable per user.)
- Should materials be soft-deleted to preserve history? (Recommended: yes.)
- Is Stock Adjustment for Managers granted per user? (Assumed: yes, via permission flag.)
- PostgreSQL vs MySQL final choice. (Recommended: PostgreSQL.)
