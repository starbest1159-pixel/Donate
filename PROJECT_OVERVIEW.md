# สารบัญ

- คำนำ
- ขอบเขตเอกสาร
- แนวทางการออกแบบ
- วิธีคิด (Architecture & Decision Making)
- ภาพรวมระบบ
- สิ่งที่ระบบทำ
- การทำงานเชิงกระบวนการ (Core Flow)
- ส่วนประกอบเชิงตรรกะ
- การผสานงานกับระบบอื่น (Integration)
- ความปลอดภัยและแนวปฏิบัติ
- ข้อพิจารณาด้านสเกลและความทนทาน
- การทดสอบและการสังเกตการณ์
- เอกสารแนบท้าย (Glossary, Checklist)

---

# คำนำ

เอกสารนี้อธิบายภาพรวมและแนวทางการทำงานของระบบ "Donate" (ระบบจัดการคำขอมอบเงินแบบ Session-Based) ในระดับสถาปัตยกรรมและการใช้งาน โดยเน้นการอธิบาย flow การทำงานและข้อควรพิจารณาในการใช้งานจริง โดยไม่เปิดเผยข้อมูลด้านการนำไปใช้ภายในหรือความลับเชิงเทคนิค

# ขอบเขตเอกสาร

- อธิบายพฤติกรรมของระบบในระดับ logical architecture
- ระบุ lifecycle ของ session และ flow การอนุมัติ
- ให้แนวทางเชิงปฏิบัติสำหรับความปลอดภัย สเกล และการทดสอบ
- ให้ข้อแนะนำในการผสานงานกับระบบชำระเงินหรือระบบอื่น ๆ

# แนวทางการออกแบบ

- Security-first: ออกแบบโดยคำนึงถึงความปลอดภัยของข้อมูลและสิทธิ์การเข้าถึงเป็นสำคัญ
- Privacy-aware: เก็บข้อมูลเฉพาะที่จำเป็นและกำหนดนโยบายการลบ/retention
- Modular & Clear Boundaries: แยกส่วนของ session management, workflow, storage และ notification
- Resilient by Design: รองรับ retry, idempotency และมีกลไกจัดการการล้มเหลว
- Observability: เก็บ metrics, logs และ traces เพียงพอสำหรับการวินิจฉัย

# วิธีคิด (Architecture & Decision Making)

- เริ่มจาก user journeys ของคำขอการมอบเงิน กำหนด state machine ของ session และจุดตรวจสอบ
- แยก stateful components (session store) จาก stateless components (API) เพื่อให้สเกลได้ง่าย
- ใช้ workflow/approval engine สำหรับการจัดการ multi-step approvals
- กำหนด contract ชัดเจนระหว่างระบบ (เช่น PSAistudio สำหรับ payment flow)

---

## ภาพรวมระบบ

ระบบ Donate จัดการคำขอการมอบเงินในรูปแบบ session-based — แต่ละคำขอถูกติดตามเป็น session ที่มี lifecycle ตั้งแต่สร้าง ตรวจสอบ อนุมัติ/ปฏิเสธ จนถึงมอบเงินและปิด session

## สิ่งที่ระบบทำ (Capabilities)

- สร้าง session สำหรับคำขอการมอบเงิน พร้อม metadata
- รองรับ multi-step approval และ role-based approvals
- จัดการสถานะ session และประวัติการตัดสินใจ (audit trail)
- เชื่อมต่อกับระบบชำระเงินเพื่อดำเนินการมอบเงินเมื่ออนุมัติ
- แจ้งเตือนและติดตามสถานะให้ผู้เกี่ยวข้อง

## การทำงานเชิงกระบวนการ (Core Flow)

1. ผู้ขอสร้างคำขอ -> ระบบสร้าง session ใหม่พร้อมสถานะเริ่มต้น
2. ระบบแจ้งไปยังผู้ตรวจสอบ/ผู้อนุมัติ -> ผู้ตรวจสอบดำเนินการพิจารณา (แนบเอกสารถ้าจำเป็น)
3. ผู้ตรวจสอบอนุมัติหรือปฏิเสธ -> session ถูกอัพเดตและบันทึกเหตุการณ์
4. หากอนุมัติ -> เริ่มกระบวนการมอบเงิน (เชื่อมต่อกับ PSAistudio หรือระบบชำระเงิน)
5. เมื่อมอบเงินเสร็จ -> session ถูกปิดและบันทึกประวัติ
6. รายงานและ audit สามารถดึงมาใช้ตรวจสอบย้อนหลังได้

## ส่วนประกอบเชิงตรรกะ

- Session Manager: จัดการ lifecycle และสถานะของ session
- Workflow/Approval Engine: จัดการขั้นตอนการตรวจสอบและอนุมัติ
- RBAC: ควบคุมสิทธิ์ผู้ขอ ผู้ตรวจสอบ และผู้ดูแล
- Document Store: เก็บเอกสารแนบ (เข้ารหัส/จำกัดการเข้าถึง)
- Notification Engine: แจ้งเตือนผ่านช่องทางต่าง ๆ
- Integration Adapter: เชื่อมต่อกับระบบช��ระเงินและระบบภายนอก
- Audit Log: เก็บประวัติการกระทำทั้งหมดบน session

## การผสานงานกับระบบอื่น (Integration)

- สร้าง payment request ใน PSAistudio โดยส่ง metadata ของ session และรับ token/URL เพื่อนำไปใช้ในการมอบเงิน
- ใช้ callback/webhook pattern เพื่อติดตามสถานะการชำระและอัพเดต session
- เก็บ correlation id เพื่อเชื่อมต่อเหตุการณ์ข้ามระบบสำหรับการ audit

---

## ความปลอดภัยและแนวปฏิบัติ

- ยืนยันตัวตนและกำหนดสิทธิ์ตามบทบาทอย่างเข้มงวด
- จำกัดการเก็บข้อมูลส่วนบุคคลและกำหนดนโยบาย retention/ลบข้อมูล
- ตรวจสอบเอกสารแนบและจำกัดขนาด/ประเภทไฟล์
- ตรวจสอบการเรียกที่สำคัญด้วย idempotency และตรวจสอบการเปลี่ยนสถานะด้วย authorization checks
- เก็บ audit log ในรูปแบบที่ตรวจสอบย้อนหลังได้

## ข้อพิจารณาด้านสเกลและความทนทาน

- ออกแบบ Session Manager ให้รองรับ concurrent approvals (locking หรือ optimistic concurrency)
- กำหนด cleanup policy สำหรับ session ที่ค้าง/หมดอายุ
- ใช้ queue สำหรับงานที่ต้องประมวลผลแบบ async (เช่นการส่งแจ้งเตือนหรือการเรียกชำระเงิน)

## การทดสอบและการสังเกตการณ์

- ทดสอบ workflow หลัก (happy path, rejection, rework)
- Mock การเชื่อมต่อกับระบบชำระเงินในการทดสอบ
- เก็บ metrics ของ time-to-approval, throughput ของ session และ error rates
- เปิดใช้งาน alert สำหรับการติดขัดของ approval flow

---

## Appendix: Checklist

- กำหนด role และนโยบายการเข้าถึงอย่างชัดเจน
- ตรวจสอบ webhook/callback และ signature validation
- เปิดใช้งาน audit log และนโยบาย retention
- เตรียมแผนการ backup และ recovery
- ทดสอบ flow สำคัญบน staging
