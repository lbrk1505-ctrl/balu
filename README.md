# 🏬 Balu Mall — Star City Mall Web Platform

A full-stack **Node.js + Express + MongoDB** shopping mall web application with a public-facing website and a secure admin panel.

---

## ✨ Features

- 🏪 **Store Directory** — Browse all mall shops with categories, floors & contact info  
- ⭐ **Reviews System** — Customers can submit and view reviews  
- 📬 **Contact Form** — Visitor enquiries stored in MongoDB  
- 🔐 **Admin Panel** — JWT-secured dashboard to manage stores, reviews & contacts  
- 📊 **Database Migration** — One-command seed script (`migrate.js`) to populate initial data  

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js v18+ |
| Framework | Express.js 4 |
| Database | MongoDB Atlas |
| Auth | JSON Web Tokens (JWT) + bcryptjs |
| Frontend | Vanilla HTML / CSS / JS |
| Config | dotenv |

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/lbrk1505-ctrl/balu.git
cd balu
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example env file and fill in your own values:

```bash
cp .env.example .env
```

Edit `.env` with your MongoDB URI, JWT secret, and admin password.

### 4. (Optional) Seed the database

```bash
node migrate.js
```

### 5. Start the server

```bash
# Production
npm start

# Development (auto-restart on file changes)
npm run dev
```

The server will run at **http://localhost:3000**

---

## 📁 Project Structure

```
balu/
├── server.js              # Express app entry point
├── migrate.js             # DB seed / migration script
├── package.json
├── .env.example           # Environment variable template
├── .gitignore
│
├── routes/                # API route handlers
│   ├── auth.js            # Login / JWT
│   ├── stores.js          # Store CRUD
│   ├── reviews.js         # Reviews CRUD
│   └── contact.js         # Contact form
│
├── middleware/
│   └── authMiddleware.js  # JWT verification middleware
│
├── admin/                 # Admin panel (HTML + CSS)
│   ├── index.html
│   └── admin.css
│
├── index.html             # Public website
├── style.css
└── script.js
```

---

## 🔑 Environment Variables

See [`.env.example`](.env.example) for all required variables.

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB Atlas connection string |
| `DB_NAME` | Database name (e.g. `balaji`) |
| `PORT` | HTTP server port (default: `3000`) |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `ADMIN_PASSWORD` | Admin panel login password |

> ⚠️ **Never commit your `.env` file.** It is listed in `.gitignore`.

---

## 📜 API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `POST` | `/api/auth/login` | ❌ | Admin login → returns JWT |
| `GET` | `/api/stores` | ❌ | List all stores |
| `POST` | `/api/stores` | ✅ | Add a store |
| `PUT` | `/api/stores/:id` | ✅ | Update a store |
| `DELETE` | `/api/stores/:id` | ✅ | Delete a store |
| `GET` | `/api/reviews` | ❌ | List all reviews |
| `POST` | `/api/reviews` | ❌ | Submit a review |
| `DELETE` | `/api/reviews/:id` | ✅ | Delete a review |
| `GET` | `/api/contact` | ✅ | View all enquiries |
| `POST` | `/api/contact` | ❌ | Submit an enquiry |

---

## 🤝 Contributing

1. Fork the repo  
2. Create your feature branch: `git checkout -b feature/my-feature`  
3. Commit your changes: `git commit -m 'Add my feature'`  
4. Push to the branch: `git push origin feature/my-feature`  
5. Open a Pull Request  

---

## 📄 License

ISC © Star City Mall
