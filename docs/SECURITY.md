# Security notes

- ห้าม commit secrets (API keys, DB passwords) ลงใน repo
- เก็บ secrets ใน GitHub Secrets / vault
- สแกน dependencies ด้วย `npm audit` หรือ Dependabot (enable)
- กำหนด HTTP security headers และ validation สำหรับ input
- ใช้ HTTPS สำหรับการสื่อสารทั้งหมด
