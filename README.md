# JAA Backend REST API

Production-ready, enterprise-grade Node.js and Express RESTful backend architecture built specifically for the **JAA (Jewellers Association Ahmedabad) Admin Panel**.

---

## 🌟 Key Features

- **Direct MongoDB Database (`JAA_Backend`)**: Connected to your local MongoDB server and accessible via **MongoDB Compass** at `mongodb://127.0.0.1:27017/JAA_Backend`.
- **Zero Dummy/Fake Data**: No hardcoded dummy arrays in code. All data is persisted directly into real MongoDB collections ("tables").
- **Auto-Incrementing Numeric IDs**: Thread-safe sequential index IDs (`id: 1, 2, 3, 4, ...`) stored in every document and tracked by an atomic `counters` collection.
- **Modular 3-Tier Layered Architecture**: Clean separation of concerns with `controllers`, `services`, `models`, `routes`, `middlewares`, `validations`, and `config`.
- **Strict Request Validation**: Powered by **Zod** schema validators for incoming request payloads and query parameters.
- **Enterprise Security**:
  - `helmet`: Secure HTTP headers
  - `cors`: Configurable CORS whitelisting (defaults to `localhost:3000`, `localhost:5173`, `localhost:3001`)
  - `express-rate-limit`: Brute force and DDoS mitigation
  - `jsonwebtoken` & `bcryptjs`: Secure JWT authentication and password hashing
  - `cookie-parser`: Secure HTTP-only cookies
- **Production Logging**: Winston logger with colored console formatting and Morgan HTTP request streaming.
- **File & Media Uploads**: Multer disk storage for avatars, event posters, post thumbnails, and attachments.
- **Unified Response & Error Envelopes**: Consistent API response formatting via `ApiResponse` and centralized `errorHandler` with `ApiError`.

---

## 📁 Project Structure

```
d:\JAA-Backend\
├── src\
│   ├── config\                # Configuration settings
│   │   ├── env.js             # Validated environment variables
│   │   ├── db.js              # Database connection with graceful fallback
│   │   └── logger.js          # Winston logging engine
│   ├── constants\             # Constants and enums
│   │   ├── status.js          # Member, complaint, lead, post statuses
│   │   └── roles.js           # User roles (Admin, Member, Committee)
│   ├── controllers\           # HTTP Request/Response controllers
│   │   ├── authController.js
│   │   ├── memberController.js
│   │   ├── committeeController.js
│   │   ├── eventController.js
│   │   ├── groupController.js
│   │   ├── broadcastController.js
│   │   ├── leadController.js
│   │   ├── complaintController.js
│   │   ├── postController.js
│   │   ├── dashboardController.js
│   │   └── uploadController.js
│   ├── data\                  # Database initializers
│   │   └── seedRunner.js      # MongoDB initial verification runner (`npm run seed`)
│   ├── middlewares\           # Express middlewares
│   │   ├── authMiddleware.js      # JWT authentication and role authorization
│   │   ├── errorMiddleware.js     # Centralized global error handler
│   │   ├── notFoundMiddleware.js  # 404 handler for missing routes
│   │   ├── rateLimiter.js         # Security rate limiters
│   │   ├── uploadMiddleware.js    # Multer file upload handler
│   │   └── validateMiddleware.js  # Zod schema validation middleware
│   ├── models\                # Mongoose models for MongoDB
│   │   ├── User.js
│   │   ├── Member.js
│   │   ├── Committee.js
│   │   ├── Event.js
│   │   ├── Group.js
│   │   ├── Broadcast.js
│   │   ├── Lead.js
│   │   ├── Complaint.js
│   │   └── Post.js
│   ├── routes\                # Express routers
│   │   ├── index.js           # Master route registry (/api)
│   │   ├── authRoutes.js
│   │   ├── memberRoutes.js
│   │   ├── committeeRoutes.js
│   │   ├── eventRoutes.js
│   │   ├── groupRoutes.js
│   │   ├── broadcastRoutes.js
│   │   ├── leadRoutes.js
│   │   ├── complaintRoutes.js
│   │   ├── postRoutes.js
│   │   ├── dashboardRoutes.js
│   │   └── uploadRoutes.js
│   ├── services\              # Business logic and queries
│   │   ├── authService.js
│   │   ├── memberService.js
│   │   ├── committeeService.js
│   │   ├── eventService.js
│   │   ├── groupService.js
│   │   ├── broadcastService.js
│   │   ├── leadService.js
│   │   ├── complaintService.js
│   │   ├── postService.js
│   │   └── dashboardService.js
│   ├── utils\                 # Utility helpers
│   │   ├── apiResponse.js     # Standard response envelope
│   │   ├── apiError.js        # Custom error class with status codes
│   │   ├── asyncHandler.js    # Async wrapper replacing try/catch
│   │   └── pagination.js      # Pagination math & meta generator
│   ├── validations\           # Zod schema definitions
│   │   ├── authValidation.js
│   │   ├── memberValidation.js
│   │   ├── eventValidation.js
│   │   ├── leadValidation.js
│   │   ├── complaintValidation.js
│   │   └── postValidation.js
│   ├── app.js                 # Express app assembly
│   └── server.js              # Server entry point and graceful shutdown
├── uploads\                   # Directory for uploaded media
├── .env                       # Active environment configuration
├── .env.example               # Template environment configuration
├── .gitignore                 # Git ignore rules
└── package.json               # Scripts and dependencies
```

---

## 🚀 Quick Start

### 1. Installation

Dependencies are already installed. If reinstalling:
```bash
npm install
```

### 2. Configure Environment

Review or edit `.env`:
```env
PORT=5000
NODE_ENV=development
API_PREFIX=/api
CORS_ORIGIN=http://localhost:3000,http://localhost:5173,http://localhost:3001
JWT_SECRET=jaa_super_secret_jwt_key_2026_secure_token_change_in_production
JWT_EXPIRES_IN=7d
MONGO_URI=
```

> **Note**: Leave `MONGO_URI` empty to run with the auto-seeded in-memory store. When you have a live MongoDB database, simply set `MONGO_URI=mongodb://localhost:27017/jaa_backend` and the app will automatically connect to it!

### 3. Start Development Server

```bash
npm run dev
```

Server starts at: `http://localhost:5000`

### 4. Start Production Server

```bash
npm start
```

---

## 🔑 Default Admin Credentials

- **Email**: `harveyspecter@gmail.com`
- **Password**: `admin123`
- **Role**: `Admin`

---

## 📡 API Reference Overview

All business endpoints are grouped under `/api` (index number wise sequential IDs: 1, 2, 3, 4, ...):

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server health and storage mode status |
| `POST` | `/api/auth/login` | Admin login with email & password |
| `GET` | `/api/auth/me` | Current authenticated user profile |
| `POST` | `/api/auth/logout` | Clear session cookie |
| `GET` | `/api/members` | Get paginated members with search & status filters |
| `GET` | `/api/members/stats` | Counts for members (all, pending, approved, rejected) |
| `GET` | `/api/members/:id` | Get single member details (e.g. `/api/members/1`) |
| `PATCH` | `/api/members/:id/status` | Approve or reject member (`{ status, reason }`) |
| `POST` | `/api/members` | Register new member |
| `GET` | `/api/committee` | Get executive committee members list |
| `POST` | `/api/committee` | Add committee member |
| `PUT` | `/api/committee/:id` | Update committee member |
| `DELETE` | `/api/committee/:id` | Delete committee member |
| `GET` | `/api/events` | List events with date/search filters |
| `POST` | `/api/events` | Create new event |
| `PATCH` | `/api/events/:id/status` | Toggle event active status |
| `DELETE` | `/api/events/:id` | Remove event |
| `GET` | `/api/groups` | List member groups |
| `POST` | `/api/groups` | Create member group |
| `GET` | `/api/broadcasts` | List broadcasts and announcement history |
| `POST` | `/api/broadcasts` | Create and send broadcast (ID: 1, 2, 3...) |
| `GET` | `/api/leads` | List trade leads with pagination |
| `POST` | `/api/leads` | Create new lead |
| `POST` | `/api/leads/import` | Bulk import leads |
| `DELETE` | `/api/leads/:id` | Delete lead |
| `GET` | `/api/complaints` | List member complaints / grievances |
| `POST` | `/api/complaints` | Register a new complaint |
| `PATCH` | `/api/complaints/:id/status` | Update status (`Under Review`, `Resolved`, etc.) |
| `DELETE` | `/api/complaints/:id` | Delete complaint |
| `GET` | `/api/posts` | List posts with category/tab filters |
| `POST` | `/api/posts` | Create new announcement post |
| `DELETE` | `/api/posts/:id` | Delete post |
| `GET` | `/api/dashboard/stats` | Aggregate dashboard statistics & counters |
| `POST` | `/api/upload/single` | Upload single media file (Multer) |
| `POST` | `/api/upload/multiple` | Upload up to 10 media files |

---

## 🔗 Connecting with JAA Admin Frontend

In the client project (`jaa-admin-panel`), update your `.env` or `.env.local`:
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
NEXT_PUBLIC_USE_MOCK=false
```

Once `NEXT_PUBLIC_USE_MOCK=false`, the client frontend will automatically make real HTTP requests to this backend. All responses, pagination envelopes, and property keys match the frontend contracts.
