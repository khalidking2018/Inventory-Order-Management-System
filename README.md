# Inventory & Order Management System

A production-ready, containerized full-stack application for managing products, customers, and orders, featuring real-time inventory tracking, automatic stock adjustment, and a modern, high-performance dashboard UI.

## Table of Contents
1. [Architecture & Design](#architecture-design)
2. [Project Structure](#project-structure)
3. [Features & Business Rules](#features--business-rules)
4. [Local Development Setup](#local-development-setup)
   - [Running with Docker Compose (Recommended)](#running-with-docker-compose-recommended)
   - [Running Locally without Docker](#running-locally-without-docker)
5. [API Reference](#api-reference)
6. [Deployment Guide](#deployment-guide)
   - [Deploying the Backend (Render / Railway)](#deploying-the-backend-render--railway)
   - [Deploying the Frontend (Vercel / Netlify)](#deploying-the-frontend-vercel--netlify)
7. [Testing](#testing)

---

## 1. Architecture & Design

The application follows a modern decoupled architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                           CLIENT BROWSER                         │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 │ HTTP / JSON
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                       NGINX REVERSE PROXY                       │
│              (Hosts Frontend Static React Build)                 │
└────────────────┬───────────────────────────────┬────────────────┘
                 │ /                             │ /api/*
                 ▼                               ▼
┌─────────────────────────────────┐     ┌─────────────────────────┐
│        REACT FRONTEND           │     │     FASTAPI BACKEND     │
│   (Vite / React 19 / Lucide)    │     │      (Python 3.11)      │
└─────────────────────────────────┘     └────────────┬────────────┘
                                                     │
                                                     │ PostgreSQL Connection
                                                     ▼
                                        ┌─────────────────────────┐
                                        │   POSTGRESQL DATABASE   │
                                        │    (Data Persistence)   │
                                        └─────────────────────────┘
```

*   **Frontend**: Built with **React** and **Vite** for blazing fast compilation and hot module reloading. Styled with **Vanilla CSS** following a modern, responsive, glassmorphic dark-slate aesthetic with smooth micro-animations. Iconography is provided by **Lucide React**.
*   **Backend**: Powered by **FastAPI** due to its high performance, automatic OpenAPI documentation, and robust request validation using **Pydantic v2**.
*   **Database**: **PostgreSQL** is utilized for reliable, ACID-compliant relational data storage. Database tables are automatically managed and initialized on application startup using **SQLAlchemy ORM**.
*   **Orchestration**: A unified **Docker Compose** configuration binds the frontend, backend, and database services together, making the system runnable locally with a single command.

---

## 2. Project Structure

```
inventory/
├── docker-compose.yml         # Local multi-container orchestration
├── .env                       # Environment variables (ignored in Git)
├── .env.example               # Example template for environment config
├── .gitignore                 # Git ignored files & folders
├── README.md                  # Project documentation (This file)
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # Entry point & dashboard endpoint
│   │   ├── config.py          # Configuration and env loading
│   │   ├── database.py        # SQLAlchemy engine and session setup
│   │   ├── models.py          # SQLAlchemy database models
│   │   ├── schemas.py         # Pydantic request/response schemas
│   │   ├── crud.py            # Database operations & business logic
│   │   └── routers/           # Sub-routers for each entity
│   │       ├── __init__.py
│   │       ├── products.py
│   │       ├── customers.py
│   │       └── orders.py
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_main.py       # Comprehensive unit & integration tests
│   ├── Dockerfile             # Production-ready Python Dockerfile
│   ├── .dockerignore
│   └── requirements.txt       # Python package dependencies
└── frontend/
    ├── src/
    │   ├── components/        # Isolated sub-components
    │   ├── App.jsx            # Main app container & router state
    │   ├── index.css          # Global styles & custom theme variables
    │   └── main.jsx           # React rendering entry point
    ├── index.html             # HTML Shell & SEO tags
    ├── vite.config.js         # Vite configuration & API proxying
    ├── Dockerfile             # Multi-stage production Nginx/React Dockerfile
    ├── nginx.conf             # Custom Nginx proxy configuration
    └── package.json           # Node dependencies & scripts
```

---

## 3. Features & Business Rules

### Core Features
- **Dashboard**: High-level KPI metrics showing total counts of products, customers, and orders alongside real-time indicators of low-stock and out-of-stock inventory items.
- **Product Management**: Ability to view, search (by name or SKU), create, edit, and delete products.
- **Customer Management**: Ability to view, search, create, and delete customers.
- **Order Management**: Multiline-item order builder. Select a customer, choose multiple products with varying quantities, see live price calculations, and submit the order. Inspect any order to view individual line-item costs, order time, and customer details.

### Business Rules Enforced
- **SKU Uniqueness**: Rejects creation or update of any product that attempts to use an existing SKU code.
- **Email Uniqueness**: Rejects creation of a customer with an email address already registered in the system.
- **Stock Validation**: Prevents orders from being created if any requested item exceeds the currently available stock.
- **Automatic Stock Adjustments**:
  - Placing an order decrements the stock of all associated products in a safe database transaction.
  - Deleting/canceling an order restores the stock back to the inventory automatically.
- **Deletion Safeguards**:
  - Prevents deleting products that are linked to one or more order invoices.
  - Prevents deleting customers that have placed orders.

---

## 4. Local Development Setup

### Running with Docker Compose (Recommended)

Make sure you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

1. **Clone the repository** and navigate to the root directory.
2. **Create a `.env` file** in the root:
   ```bash
   cp .env.example .env
   ```
3. **Build and spin up the containers**:
   ```bash
   docker-compose up --build
   ```
4. **Access the application**:
   - Frontend (and Nginx Proxy): [http://localhost](http://localhost)
   - Backend API Docs (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)

### Running Locally without Docker

For rapid development without containers, you can run the components individually using a local SQLite file database:

#### 1. Setup the Backend
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set the database URL environment variable to point to a local SQLite database file:
   ```bash
   # On Windows (PowerShell):
   $env:DATABASE_URL="sqlite:///./dev.db"
   # On macOS/Linux:
   export DATABASE_URL="sqlite:///./dev.db"
   ```
5. Launch the backend development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

#### 2. Setup the Frontend
1. In a new terminal, navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Launch the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser to the URL printed in the console (usually [http://localhost:5173](http://localhost:5173)). The Vite development proxy will forward all requests beginning with `/api` to the backend on `http://127.0.0.1:8000`.

---

## 5. API Reference

All requests and responses use JSON. Error responses follow the standard RFC 7807 problem details format via FastAPI's `HTTPException`.

### Products
- **`GET /api/products/`** - List all products.
- **`GET /api/products/{id}`** - Retrieve product details.
- **`POST /api/products/`** - Create a product.
  - Body: `{"name": "String", "sku": "String", "price": 0.0, "quantity": 0}`
- **`PUT /api/products/{id}`** - Update product details.
  - Body: `{"name": "String", "price": 0.0, "quantity": 0}`
- **`DELETE /api/products/{id}`** - Delete a product.

### Customers
- **`GET /api/customers/`** - List all customers.
- **`GET /api/customers/{id}`** - Retrieve customer details.
- **`POST /api/customers/`** - Create a customer.
  - Body: `{"name": "String", "email": "user@example.com", "phone": "String"}`
- **`DELETE /api/customers/{id}`** - Delete a customer.

### Orders
- **`GET /api/orders/`** - List all orders.
- **`GET /api/orders/{id}`** - Retrieve order details including line items.
- **`POST /api/orders/`** - Place an order (deducts stock, auto-calculates total price).
  - Body: 
    ```json
    {
      "customer_id": 1,
      "items": [
        { "product_id": 2, "quantity": 5 },
        { "product_id": 3, "quantity": 1 }
      ]
    }
    ```
- **`DELETE /api/orders/{id}`** - Cancel and delete an order (restores product stocks).

### Dashboard
- **`GET /api/dashboard`** - Get high-level statistics & low stock warnings.

---

## 6. Deployment Guide

### Deploying the Backend (Render / Railway / Fly.io)

Since the backend is fully containerized, you can deploy it directly via Docker:

#### Using Render
1. Create a PostgreSQL Database on Render. Copy the **External Database URL**.
2. Create a new **Web Service** on Render pointing to your GitHub repository.
3. Select **Docker** as the environment.
4. Set the context directory to `backend` and Dockerfile to `backend/Dockerfile` (or set the root to `backend` and use `Dockerfile` in the root).
5. Add an Environment Variable:
   - `DATABASE_URL` = (Your Render PostgreSQL Database connection string).
6. Click **Deploy**.

#### Using Railway
1. Click **New Project** -> **Provision PostgreSQL**.
2. Add a new service -> **Github Repo** -> Link your repository.
3. Under the service settings, set the root directory to `/backend`. Railway will automatically detect the `Dockerfile`.
4. Add the connection string variable. Railway auto-injects `DATABASE_URL` when linked to a database service.
5. Deploy.

---

### Deploying the Frontend (Vercel / Netlify / Cloudflare Pages)

#### Pre-requisite: Base API URL configuration
By default, the frontend uses relative paths (e.g. `/api/products/`) because Nginx proxies them under a single port. When deploying to separate hosts (like Frontend on Vercel and Backend on Render), update the API base URL in `frontend/src/App.jsx` to point to the production backend:
```javascript
const API_BASE = 'https://your-backend-service.onrender.com/api';
```

#### Deploying on Vercel
1. Install the Vercel CLI or connect your Github repository via the Vercel Dashboard.
2. Select the `frontend` folder as the root directory of your Vercel project.
3. Framework Preset: **Vite**.
4. Click **Deploy**.

---

## 7. Testing

To execute the automated unit and integration tests locally, run:
```bash
python -m unittest backend/tests/test_main.py
```
These tests use a local SQLite configuration to isolate test data, test constraint checks, concurrency protection (row locks), stock management, and automatic rollback on failure.
