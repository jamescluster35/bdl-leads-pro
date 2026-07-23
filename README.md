# 📊 BDL Leads Pro — CRM Client Portal

This repository houses the modern component-based **Client CRM Portal & Dashboard** built using **React + Vite** for **BDL Revenue Intelligence**. It interfaces directly with the serverless Google Sheets database via the Apps Script routing API, offering lead prioritization, outreach templates, and prospect targeting.

---

## 📁 Repository Directory Structure

```text
bdl-leads-pro/
├── src/
│   ├── components/
│   │   ├── Layout/
│   │   │   └── Sidebar.jsx        # Sidebar navigation with active status counts
│   │   └── ui/
│   │       ├── AddLeadModal.jsx   # Modal for logging new prospects
│   │       └── LeadDetailPanel.jsx # Outreach logger & lead info panel
│   ├── hooks/
│   │   └── useIdleTimer.js        # Idle timeout (28 min warning, 30 min logout)
│   ├── lib/
│   │   ├── sheetsApi.js           # API wrapper calling Apps Script macro URL
│   │   └── scoreHelper.js         # Priority score calculation utility (0-100)
│   ├── pages/
│   │   ├── LeadsPage.jsx          # Leads list, prioritization, & sorting controls
│   │   ├── DashboardPage.jsx      # Metrics charts & conversion rates
│   │   ├── ArchivedPage.jsx       # Cold and lost records historical list
│   │   ├── TemplatesPage.jsx      # Outreach template catalog with variable copy
│   │   ├── ClientsPage.jsx        # Promoted active clients list
│   │   ├── ProspectFinderPage.jsx # Google Maps and Google Search target scraper
│   │   └── LoginPage.jsx          # CRM access gate screen
│   ├── store/
│   │   ├── leadsStore.js          # Zustand store for leads state sync
│   │   └── templatesStore.js      # Zustand store for templates state sync
│   ├── App.jsx                    # Routing table & authentication gateway
│   ├── main.jsx                   # React application entry point
│   └── index.css                  # Tailwind styles and custom dark styling overrides
├── package.json                   # Build dependencies and vite commands
├── tailwind.config.js             # Layout grids and orange theme palette configs
├── vite.config.js                 # Dev server parameters
└── README.md                      # System Reference Documentation
```

---

## ⚙️ Core CRM Systems

### 1. Lead Priority Scoring Engine

Leads are scored dynamically out of **100 points** locally in the portal without polluting your spreadsheet database with raw calculations. The score calculates based on:

* **Deal Stage (Max 30 pts):** `Negotiating` (30), `Pitched` (20), `New` (10).
* **Lead Status (Max 25 pts):** `Warm` (25), `New` (15), `Cold` (5).
* **Follow-Up Count (Max 20 pts):** Sweet spot of `1-3` (20), `0` (10), `>3` (5).
* **Recency of contact (Max 25 pts):** within `3 days` (25), `7 days` (15), `14 days` (5).

*Displays with glowing badge states matching priority tiers (High, Medium, Low) and supports automatic sorting.*

### 2. Smart Prospect Finder

A built-in utility allowing lead research without API charges:

* Opens pre-populated local searches in Google Maps (`[niche] in [city]`) to identify businesses with low reviews or missing sites.
* Opens target searches in Google Search (`[niche] [city] email contact`) to extract emails.
* Includes a daily target checklist that automatically tracks progress for **10 leads per day** (resets automatically at midnight).
* Houses administration panels to manually run follow-up email notifications or configure daily 9 AM backend reminders.

### 3. CRM Security & Idle Guard

* CRM access is restricted by a localized security password gate.
* Implements an **Idle Session Timer**: after 28 minutes of user inactivity (no mouse movements or keystrokes), a warning modal triggers. After 30 minutes, it automatically signs the user out to protect pipeline confidentiality.

---

## 👨‍💻 My Contribution & Role Alignment

* **Target Roles**: `Data Operations Lead` | `AI Automation Engineer` | `BI Developer`
* **Workflow Architecture**: Designed lead priority scoring logic (0-100 pts), idle security timeouts (30 mins), and Apps Script macro API routing.
* **Frontend Development**: Built responsive React components using Zustand state management and Tailwind CSS styling.
* **Testing & Security**: Implemented client-side password authentication gate and idle session inactivity watcher (`useIdleTimer`).

---

## 🚀 Local Development Setup

### 1. Prerequisites

Ensure you have Node.js (v18+) installed on your local computer.

### 2. Installation

Clone the repository and install dependencies:

```bash
# Clone the repository
git clone https://github.com/LeadGenData/bdl-leads-pro.git

# Navigate into project folder
cd bdl-leads-pro

# Install packages
npm install
```

### 3. Run Development Server

Start the local server with hot reloading:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Create Production Build

Bundle the assets for high-performance deployment:

```bash
npm run build
```

Vite will compile the code to the `/dist` directory, which can be deployed to static hosting solutions like Cloudflare Pages, Netlify, or GitHub Pages.
