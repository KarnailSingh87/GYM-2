# Gym Management Backend

This backend is Node.js + Express + MongoDB. It includes a Baileys-based WhatsApp helper for OTP and welcome messages.

Env (see `.env.example`):

- PORT
- MONGO_URI
- JWT_SECRET
- ADMIN_EMAIL
- ADMIN_PASSWORD_HASH (bcrypt hash)
- WA_SESSION_ID

Install and run:

```bash
cd backend
npm install
npm run dev
```

Notes:
- The admin login expects `ADMIN_PASSWORD_HASH` to be a bcrypt hash. You can generate one with a small Node snippet or via bcrypt CLI.
- Sessions for Baileys are stored in `sessions/${WA_SESSION_ID}.json`.
