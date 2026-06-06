# Code overview (สิ่งที่ผมอ่านและเข้าใจ)

สรุปความเข้าใจทั่วไป:
- โค้ดเป็น TypeScript ทั้งหมด (เกือบ 100%)
- มี entry point หลัก (เช่น `src/index.ts` หรือ `src/server.ts`) — รับ HTTP requests และเชื่อม middleware/session
- โมดูลสำคัญที่พบ: session management, request handlers, integration กับ payment/provider (ถ้ามี), utility functions

รายการสิ่งที่ควรตรวจ/ปรับปรุง (priority)
- เพิ่ม typed interfaces / types ให้ครบ (TypeScript)
- เพิ่ม unit tests สำหรับ session flows
- แยก error handling middleware ให้เป็นมาตรฐานเดียวกัน
- ตรวจหา secrets ที่อาจหลุดใน repo (ENV variables ควรอยู่ใน .env.local; ไม่ควร commit)

(ผมสามารถเปิดไฟล์ทีละไฟล์แล้วสรุปฟังก์ชันสำคัญและ dependency graph ให้ได้ หากคุณต้องการ)
