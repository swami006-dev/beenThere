# Beenthere - Backend API

Backend API for **Beenthere**, an anonymous student peer-support platform. Built with Node.js, Express, and Supabase.

---

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database & Auth**: Supabase PostgreSQL & Supabase Auth (`@supabase/supabase-js`)
- **Validation**: Zod
- **Utilities**: CORS, dotenv

---

## 📁 Project Structure

```text
beenthere-backend/
│
├── src/
│   ├── config/
│   │   └── env.js            # Environment variable validation (Zod)
│   ├── db/
│   │   └── supabase.js       # Supabase client initialization
│   ├── middleware/
│   │   ├── auth.js           # Supabase JWT authentication
│   │   ├── authorize.js      # Role-based authorization
│   │   ├── errorHandler.js   # Centralized error handler
│   │   └── notFound.js       # 404 handler
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── posts.routes.js
│   │   ├── responses.routes.js
│   │   ├── reports.routes.js
│   │   ├── moderation.routes.js
│   │   └── experiences.routes.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── posts.controller.js
│   │   ├── responses.controller.js
│   │   ├── reports.controller.js
│   │   ├── moderation.controller.js
│   │   └── experiences.controller.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── posts.service.js
│   │   ├── responses.service.js
│   │   ├── reports.service.js
│   │   ├── moderation.service.js
│   │   └── experiences.service.js
│   ├── schemas/
│   │   ├── auth.schema.js
│   │   ├── posts.schema.js
│   │   ├── responses.schema.js
│   │   ├── reports.schema.js
│   │   └── experiences.schema.js
│   ├── utils/
│   │   ├── apiResponse.js    # Standardized response format
│   │   └── errors.js         # Custom AppError classes
│   └── app.js                # Express app entry point
│
├── tests/
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### 1. Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm (installed with Node)

### 2. Installation

Clone the repository and install dependencies:

```bash
npm install
```

### 3. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set the environment variables in `.env`:

```env
PORT=5000
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_publishable_key
CORS_ORIGIN=http://localhost:5173
```

> **Note**: Never commit `.env` to version control. It is already included in `.gitignore`.

### 4. Running the Server

#### Development Mode (with automatic reload via nodemon):
```bash
npm run dev
```

#### Production Mode:
```bash
npm start
```

---

## 🩺 Health Check Endpoint

Check if the API is up and healthy:

```http
GET /api/health
```

**Response (HTTP 200)**:
```json
{
  "success": true,
  "data": {
    "service": "Beenthere API",
    "status": "healthy"
  }
}
```

---

## 🔒 Error and Response Standards

### Success Format
```json
{
  "success": true,
  "data": {}
}
```

### Error Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```
