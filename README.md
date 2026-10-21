# DecoStone Material Management System

DecoStone MMS is a web application for managing materials and inventory across multiple warehouses (called **godowns**). It supports stock receipts and dispatches, transfers, physical counts, purchasing and sales workflows, user permissions, reporting, and audit history.

## Contents

- [At a glance](#at-a-glance)
- [How the app works](#how-the-app-works)
- [Features](#features)
- [Roles and access](#roles-and-access)
- [Technology](#technology)
- [Project layout](#project-layout)
- [Run locally](#run-locally)
- [Database and SQL reference](#database-and-sql-reference)
- [API overview](#api-overview)
- [Backups and restore](#backups-and-restore)

## At a glance

| Part | Purpose |
|---|---|
| `frontend/` | React single-page application served by Vite during development |
| `backend/` | Express REST API, authentication, inventory rules, and database access |
| SQLite | Stores accounts, catalog, warehouse balances, orders, movements, and audit history |
| `docs/` | Requirements, architecture notes, presentation material, and database query reference |

The default database file is `backend/data/decostone.db`. The backend can use another location via `DATABASE_PATH` or `DATA_DIR`.

## How the app works

1. A user signs in through the frontend. The API verifies the account and returns a JWT.
2. The frontend sends API requests with that token.
3. The backend checks the user's role, permissions, and warehouse assignment, then validates the requested operation.
4. Inventory changes update the stock balance and write transaction history. Multi-step stock operations use database transactions so related updates succeed or roll back together.
5. The frontend refreshes the affected views and displays the result.

The frontend is not the database connection. For local development, both the API and Vite frontend need to be running.

## Features

- **Dashboard:** inventory totals and valuation, warehouse and category breakdowns, movement trends, low-stock indicators, and recent transactions.
- **Catalog:** categories, materials, SKU and barcode fields, prices, units, minimum stock, and material images.
- **Warehouse inventory:** browse godown balances and stock status.
- **Stock movements:** record receipts and dispatches; dispatches are rejected if they exceed available stock.
- **Transfers:** move stock between godowns with a traceable transfer record.
- **Reconciliation:** adjust balances or run cycle counts with submission and manager review.
- **Operations:** maintain suppliers and customers; draft and approve purchase or sales orders; track lot, shade, caliber, and expiry details on purchase receipts.
- **Traceability tools:** search by SKU/barcode, view lots, and print item labels.
- **Low stock and reports:** review reorder suggestions and export supported reports to PDF or Excel.
- **Administration:** manage users and permissions, settings, audit history, and database backups.

Inventory changes should be performed through the application. The SQL reference below is for viewing and checking records.

## Roles and access

| Role | Typical access |
|---|---|
| **Admin** | User administration, settings, audit logs, and organization-wide management |
| **Manager** | Catalog and operational workflows, reviews, transfers, and reports |
| **Supervisor** | Stock workflows and views scoped to the assigned godown, subject to account permissions |

The backend enforces access rules on API requests; hiding a menu item in the frontend is not the security boundary. A user who has created inventory history should generally be deactivated instead of deleted so past actions remain attributable.

### Development demo accounts

A fresh development database is seeded with these demo accounts:

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Manager | `manager` | `manager123` |
| Supervisor | `supervisor1` | `supervisor123` |
| Supervisor | `supervisor2` | `supervisor123` |

These are for local development only. Do not use demo credentials in a production deployment.

## Technology

- **Frontend:** React, Vite, CSS, Recharts, Lucide React, jsPDF, and SheetJS (`xlsx`)
- **Backend:** Node.js, Express, JWT, and bcryptjs
- **Database:** SQLite through `better-sqlite3`, with foreign keys and WAL mode

## Project layout

```text
ManagementSystem/
├── backend/
│   ├── src/
│   │   ├── controllers/   # API request handlers
│   │   ├── db/            # SQLite connection, schema, seed, and restore utility
│   │   ├── middleware/    # Authentication and access checks
│   │   ├── routes/        # REST endpoint definitions
│   │   └── services/      # Stock, audit, and notification logic
│   ├── data/              # Local SQLite database and backups (not source code)
│   └── package.json
├── docs/                  # Project documentation
│   ├── database-display-queries.txt
│   ├── architecture-and-project-overview.md
│   ├── presentation-guide.md
│   └── requirements.md
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable interface elements
│   │   ├── context/       # Authentication, theme, and notification state
│   │   ├── hooks/         # Shared React hooks
│   │   ├── pages/         # Application screens
│   │   ├── services/      # API client
│   │   └── utils/         # Export and stock-event helpers
│   └── package.json
├── package.json           # Root development/build commands
└── README.md
```

## Run locally

### Prerequisites

Install Node.js **20.19+** or **22.12+** and npm. Vite 8 requires a recent Node.js release.

### 1. Start the backend

Open PowerShell in the project folder:

```powershell
cd backend
npm install
```

Create `backend/.env` with a development secret and local frontend origin:

```env
PORT=5000
JWT_SECRET=replace-with-a-long-random-development-secret
CLIENT_ORIGIN=http://localhost:5173
```

Start the API:

```powershell
npm run dev
```

The API is at `http://localhost:5000`; its health check is `http://localhost:5000/api/health`.

On a fresh development database, startup initializes the schema and seeds demo data. If the database already contains users, seeding is skipped.

### 2. Start the frontend

Open a second PowerShell window in the project folder:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

### Root shortcuts

From the project root, these npm scripts provide shortcuts:

```powershell
npm run dev:backend
npm run dev:frontend
npm run build:frontend
npm run lint:frontend
```

## Database and SQL reference

The default database name is **`decostone.db`**. The normal local path is `backend/data/decostone.db`; check `DATABASE_PATH` and `DATA_DIR` if the backend was configured to use another path.

The full set of read-only queries for dashboard data, stock, godowns, materials, orders, lots, cycle counts, users, reports, audit logs, and integrity checks is in [`docs/database-display-queries.txt`](docs/database-display-queries.txt). Open the database using DB Browser for SQLite and run queries from its **Execute SQL** tab. The query file explains named parameters such as `:godown_id` and `:start_date`.

The main data tables include `users`, `godowns`, `categories`, `materials`, `stock`, `stock_transactions`, `stock_transfers`, `stock_adjustments`, `suppliers`, `customers`, `inventory_orders`, `inventory_order_lines`, `stock_lots`, `count_sessions`, `count_session_lines`, `audit_logs`, and `system_settings`.

## API overview

Protected API requests require this header:

```text
Authorization: Bearer <JWT_TOKEN>
```

| Prefix | Purpose |
|---|---|
| `/api/auth` | Login, current profile, and password change |
| `/api/godowns` | Warehouse listing and administration |
| `/api/categories` | Category listing and administration |
| `/api/materials` | Catalog and material details |
| `/api/stock` | Receipts, dispatches, transfers, adjustments, and movement history |
| `/api/reports` | Dashboard summary and reports |
| `/api/users` | User and account management |
| `/api/system` | Settings and audit logs |
| `/api/operations` | Suppliers, customers, orders, lots, counts, and backups |

For exact methods and endpoint behavior, see the route files in `backend/src/routes/` and their corresponding controllers in `backend/src/controllers/`.

## Backups and restore

Admins can create a database backup from the Operations area. Restore a downloaded backup only when the backend is stopped. The restore utility validates the backup and creates a pre-restore safety copy:

```powershell
cd backend
npm run db:restore -- "C:\path\to\decostone-backup.db" --confirm-offline
```

Keep backup copies outside the project directory as well.

## More documentation

- [Architecture and project overview](docs/architecture-and-project-overview.md)
- [Requirements](docs/requirements.md)
- [Presentation guide](docs/presentation-guide.md)
- [Database display queries](docs/database-display-queries.txt)

## License

This project uses the ISC license. See `package.json` for the license declaration.
