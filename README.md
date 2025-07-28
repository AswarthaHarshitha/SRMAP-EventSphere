# 🎟️ SRMAP‑EventSphere

A modern event‑management web app developed using TypeScript and Vite. Comprises three modules:

- `server`: backend API (Node.js / Express)
- `client`: frontend UI (Vite + React or other)
- `shared`: shared types and utilities

## 🚀 Overview

Built for SRM University‑AP, this platform lets users discover events, organizers create/manage events, and participants register with barcode/QR generation for seamless event entry.

**Key Features**
- Sign up / sign in with session‑based authentication
- Event creation and management by organizing users
- Participant registration and QR/barcode issuance
- Attendance tracking via real‑time scanning
- Role-based UIs: organizers vs participants
- Strict input validation and duplicate‑entry prevention
- Clean separation between UI, backend logic, and shared types

## 🏗️ Tech Stack

| Layer     | Technologies                        |
|-----------|-------------------------------------|
| Frontend  | TypeScript, Vite (React/EJS), Tailwind CSS |
| Backend   | Node.js, Express.js, TypeScript     |
| Database  | MongoDB compass (via **Mongoose**)                                        
| Shared    | Drizzle ORM (drizzle.config.ts), shared TS types |
| Other     | `nodemon`, `dev-server.sh`, environment scripts |

## 📁 Project Structure

SRMAP-EventSphere/
├── client/ # Frontend application code
├── server/ # Express backend and API routes
├── shared/ # Shared TypeScript types & utilities
├── drizzle.config.ts # Database schema + ORM config
├── dev-server.sh # Dev environment setup script
├── start-dev.sh # Start scripts for development
├── nodemon.json # Auto reload config
├── tsconfig.json # TS configuration
├── tailwind.config.ts # Tailwind CSS config
├── theme.json # Design theme settings
└── package.json # Scripts and dependency list


## 📦 Prerequisites & Setup

### ✅ Prerequisites
- Node.js (v16+)
- npm
- MongoDB installed locally *(or use MongoDB Compass to manage it)*

---

### ⚙️ Installation

```bash
git clone https://github.com/AswarthaHarshitha/SRMAP-EventSphere.git
cd SRMAP-EventSphere
npm install

🔐 Environment Variables
Create a .env file (root or server/) with:
PORT=3000
MONGO_URI=mongodb://localhost:27017/event_sphere
SESSION_SECRET=yourSecretKey

GOOGLE_CLIENT_ID=yourGoogleClientId
GOOGLE_CLIENT_SECRET=yourGoogleClientSecret

GITHUB_CLIENT_ID=yourGitHubClientId
GITHUB_CLIENT_SECRET=yourGitHubClientSecret



Run in Development
npm run dev      

🚀 Production Mode
npm start

Then open your browser and navigate to:
👉 http://localhost:3000/
