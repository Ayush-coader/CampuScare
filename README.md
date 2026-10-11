# CampusCare - Smart Campus Problem Reporting & Resolution System

A MERN-stack app where students report campus problems (Wi-Fi, hostel, mess, plumbing...) and staff/admins assign, track and resolve them with full transparency.

```
CampusCare/
├── backend/    Express + MongoDB (Mongoose) REST API
└── frontend/   React (Vite) single-page app
```

## Quick start

You need **Node 18+** and a **MongoDB** instance (local, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster).

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env        # then edit MONGO_URI and JWT_SECRET
npm run seed                # optional: demo users + complaints (wipes the DB!)
npm run dev                 # API on http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                 # app on http://localhost:5173
```

In development Vite proxies `/api` and `/uploads` to port 5000, so no extra config is needed.

### Demo logins (after `npm run seed`)

| Role    | Email                  | Password      |
|---------|------------------------|---------------|
| Admin   | admin@campus.edu       | Admin@123     |
| HOD     | hod@campus.edu         | Hod@12345     |
| Staff   | wifi@campus.edu (also hostel@, mess@, electrical@, plumbing@, infrastructure@, academic@, safety@, other@) | Staff@123 |
| Student | student1@campus.edu … student8@campus.edu | Student@123 |

## Features

**Students**
- Sign up / log in (JWT), report a problem with category, structured location (block / floor / room) and a photo
- **Duplicate detection** while typing: similar open complaints are suggested so you can upvote instead
- **Anonymous reporting**: staff and admins never see who filed it; you can still track it
- Track status with a full timeline, comment, rate the fix once resolved
- Campus feed of all open issues with upvotes

**Staff / Admin / HOD**
- Role-based dashboards with filters (status, category, priority, overdue, unassigned)
- Status updates with notes, internal notes hidden from students
- Admin: assign to staff, override priority, create staff accounts (`POST /api/users`)
- Analytics: by category, trend, resolution time, hotspots, SLA breaches, average rating (admin + HOD)

**"Smart" behaviour**
- **Auto-assignment** to the least-loaded staff member of the complaint's category
- **SLA + escalation**: every category has a target time; a cron job (every 15 min) flags overdue tickets and raises their priority
- **Priority**: starts from the category's base priority (e.g. Safety = critical); 5+ upvotes raises it to High
- **Audit trail**: every status change / assignment / escalation is stored with who and when
- Spam control: rate limiting + max 5 complaints per student per 24 h

## Roles

| Role    | Can do |
|---------|--------|
| student | Create & track own complaints, upvote, comment, rate |
| staff   | Manage complaints in their category or assigned to them |
| admin   | Everything: assign, prioritise, delete, analytics, create staff |
| hod     | Read-only view of all complaints + analytics |

## API overview

| Method | Route | Access |
|--------|-------|--------|
| POST | `/api/auth/register`, `/api/auth/login` | public |
| GET | `/api/auth/me` | any |
| GET | `/api/meta` | public (categories, SLAs, blocks) |
| GET / POST | `/api/complaints` | role-scoped list / student create (multipart) |
| GET | `/api/complaints/feed`, `/api/complaints/similar` | any |
| GET / DELETE | `/api/complaints/:id` | owner, assigned staff, admin, HOD |
| PATCH | `/api/complaints/:id/status` | staff, admin |
| PATCH | `/api/complaints/:id/triage` | admin |
| POST | `/api/complaints/:id/upvote` | student, staff |
| POST | `/api/complaints/:id/rating` | owner |
| GET / POST | `/api/complaints/:id/comments` | owner, staff, admin, HOD |
| GET | `/api/analytics` | admin, HOD |
| GET / POST | `/api/users/staff`, `/api/users` | admin |

## Configuration

`backend/.env`

| Variable | Purpose |
|----------|---------|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string used to sign tokens |
| `CLIENT_URL` | Frontend origin(s) for CORS, comma separated |
| `ALLOWED_EMAIL_DOMAIN` | Optional: restrict sign-up to e.g. `college.edu` |
| `AUTO_ASSIGN` | `false` to turn off auto-assignment |

Edit categories, SLA hours, blocks and thresholds in `backend/utils/constants.js`; the frontend picks them up from `/api/meta`.

## Deploying

- **Database:** MongoDB Atlas
- **Backend:** Render / Railway. Set the env vars above. Uploaded images are stored on local disk, which is wiped on most free hosts - for production swap `backend/middleware/upload.js` for Cloudinary or S3 storage.
- **Frontend:** Vercel / Netlify. Set `VITE_API_URL` (e.g. `https://your-api.onrender.com/api`) and `VITE_ASSET_URL` (e.g. `https://your-api.onrender.com`), build with `npm run build`, and add a rewrite of all paths to `/index.html` for client-side routing.

## Ideas for next steps

Socket.io live updates, email notifications (Nodemailer), QR codes per location that pre-fill the form, a reopen flow for unhappy ratings, tests (Jest + Supertest).
