# AgriDemand AI

**An AI-powered agricultural marketplace connecting farmers and buyers.**

## Overview

AgriDemand AI is a software platform designed to support agricultural commerce by connecting farmers, consumers, and bulk buyers through digital produce listings, buyer requests, order management, and payment workflows.

## Problem Statement

Agricultural buyers and farmers need a more organized way to discover produce, manage purchasing requests, coordinate orders, and track payments.

AgriDemand AI aims to provide a centralized platform for these workflows.

## Core Features

- Farmer and buyer workflows
- User authentication and role-based access
- Agricultural produce listings
- Buyer requests and matching workflows
- Consumer and bulk buyer dashboards
- Order management and tracking
- Payment integration workflows
- Administrative dashboard
- Market intelligence and reporting interfaces

## Technology Stack

### Backend
- Python
- FastAPI
- SQLAlchemy
- Pydantic
- Alembic
- SQLite / PostgreSQL support

### Frontend
- React
- Vite
- JavaScript
- CSS

### Payment Integrations
- Razorpay
- PayPal

## Project Structure

```text
agridemand-ai/
├── backend/
│   ├── app/
│   ├── alembic/
│   ├── scripts/
│   ├── requirements.txt
│   └── alembic.ini
├── frontend/
│   ├── src/
│   └── package.json
├── src/
├── .gitignore
└── README.md
```

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/jayamani866/agridemand-ai.git
cd agridemand-ai
```

### 2. Backend setup

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment.

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

### 3. Environment Configuration

Configure the required environment variables using a local `.env` file.

Never commit real API keys, passwords, or secrets to GitHub.

### 4. Run the backend

```bash
uvicorn app.main:app --reload
```

### 5. Frontend setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

## API Documentation

When the FastAPI backend is running, Swagger documentation is available at:

```text
http://127.0.0.1:8000/docs
```

## Development Status

AgriDemand AI is an actively developed project. Features, integrations, and workflows may evolve as development progresses.

## Repository

https://github.com/jayamani866/agridemand-ai
