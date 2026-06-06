# Usage / Setup

Environment variables (ตัวอย่าง)
- PORT=3000
- NODE_ENV=development
- SESSION_SECRET=<strong secret>
- SESSION_STORE_URL=redis://...
- DATABASE_URL=<database connection string>

Commands
- Install: `npm install`
- Dev: `npm run dev`
- Build: `npm run build`
- Start: `npm start`
- Test: `npm test` (ถ้ามี)

Deployment
- แนะนำติดตั้ง Redis สำหรับ session store ใน production
- ตั้ง process manager (pm2, systemd) หรือ containerize ด้วย Docker (มี Dockerfile ใน repo)
