# Architecture Overview

ภาพรวม
- ภาษา: TypeScript
- รูปแบบ: Server-side application (Node.js/Express หรือ framework ที่คล้ายกัน) — ใช้ session-based flows สำหรับการจัดการคำขอมอบเงิน
- จุดสำคัญ: การสร้าง/เก็บ session ของผู้ใช้สำหรับจังหวะการขอ/อนุมัติเงิน (session lifetime, expiry, store)

โฟลเดอร์สำคัญ (ที่ควรมี / ควรตรวจ)
- src/ — โค้ดหลัก (controllers, services, routes, models)
- src/routes/ — routing ของ API / หน้า
- src/services/ — logic การจัดการ session, payment flow, validation
- src/middleware/ — auth, session handling, validation
- config/ หรือ src/config — config per-environment
- tests/ — unit/integration tests (ถ้ามี)

Data flow (สูง ๆ)
1. ผู้ใช้ส่งคำขอมอบเงิน (POST /donations/request)
2. สร้าง session ใหม่ (session id) — เก็บสถานะคำขอใน store (in-memory / redis / db)
3. กระบวนการอนุมัติ/การตรวจสอบ (อาจมี webhook หรือ callback)
4. เมื่อเสร็จสิ้น เปลี่ยนสถ���นะ session -> archived / completed

ข้อสังเกตจากโค้ดที่อ่าน
- ควรระบุที่เก็บ session (Redis แนะนำสำหรับ production) และเพิ่ม TTL
- ตรวจ input validation และ rate-limit สำหรับ endpoints ที่สำคัญ
- แยกข้อกังวล: controllers บางส่วนอาจผสม logic ธุรกิจกับ presentation — แนะนำย้าย logic เข้า services
