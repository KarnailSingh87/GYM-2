# Gym Admin (Frontend)

Minimal Vite + React admin UI. Uses Tailwind CSS.

Set API endpoint in `.env` (see `.env.example`) as `VITE_API_URL`.

Install and run:

```bash
cd admin
npm install
npm run dev
```

Notes:
- This minimal admin uses a stored `admin_token` in localStorage. Use the backend `/api/auth/login` to obtain a token and save as `admin_token`.
