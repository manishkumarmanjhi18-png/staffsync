# StaffSync — Modern Human Resource Management Solution

StaffSync is a full-featured MERN (MongoDB, Express, React, Node.js) web application designed to streamline internal human resource workflows, employee self-service, leave requests, daily attendance punch-ins, corporate announcements, and training management with Role-Based Access Control (RBAC).

---

## 📁 Repository Overview

```text
staffsync/
├── code/
│   ├── backend/           # Node.js + Express API server (MongoDB, JWT auth, RBAC)
│   └── frontend/          # React + Vite client application
└── Documentation/         # Comprehensive project design and engineering artifacts
    ├── Ideation Phase-(1)/
    ├── Project Planning Phase(2)/
    ├── Requirement Analysis(3)/
    ├── Project Design Phase(4)/
    └── Performance Testing/
```

- **[Application Code](code/)**: Source code for both backend and frontend. See [code/README.md](code/README.md).
- **[Documentation Hub](Documentation/)**: Complete engineering documents including Empathy Maps, Sprint Backlog, Data Flow Diagrams (DFDs), System Architecture, and User Acceptance Testing (UAT) templates. See [Documentation/README.md](Documentation/README.md).

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/) (running locally or a MongoDB Atlas connection string)

### 1. Backend Setup
```bash
cd code/backend
npm install
```
Configure environment variables: copy `.env.example` to `.env` and adjust settings if necessary:
```env
MONGO_URI=mongodb://127.0.0.1:27017/staffsync
JWT_SECRET=your_jwt_secret_here
PORT=5000
```
Start the backend server:
```bash
npm start
```
The server will run on `http://localhost:5000`.

### 2. Frontend Setup
In a new terminal:
```bash
cd code/frontend
npm install
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

---

## 👥 Demo Credentials

| Role | Email | Password |
|---|---|---|
| **HR Admin** | `hr@staffsync.com` | `password123` |
| **Manager** | `manager@staffsync.com` | `password123` |
| **Employee** | `employee@staffsync.com` | `password123` |

---

## 🛠️ Tech Stack

- **Frontend**: React.js, Vite, Vanilla CSS
- **Backend**: Node.js, Express.js, JSON Web Tokens (JWT), Bcrypt.js
- **Database**: MongoDB with Mongoose ODM
- **Architecture**: Decoupled Client-Server RESTful Architecture with RBAC
