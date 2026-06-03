# คู่มือการใช้งาน (USER GUIDE)

เอกสารนี้เป็นคู่มือการใช้งานระดับการนำระบบไปตรวจสอบและทดสอบการทำงาน (non-sensitive operational guide)

## บทบาทหลัก
- ผู้ขอ (Requester): สร้างคำขอการมอบเงิน
- ผู้ตรวจสอบ/ผู้อนุมัติ (Reviewer/Approver): ตรวจสอบเอกสารและอนุมัติคำขอ
- ผู้ดูแลระบบ (Admin): ดูรายการ session, ทำการมอบเงินหรือคืนเงิน, และบริหารจัดการ

## การทดสอบ flow หลัก
1. สร้าง session (test)
   - ส่งคำขอสร้าง session พร้อมข้อมูลจำเป็น (amount, recipient, justification)
   - ตรวจสอบ response ว่า session ถูกสร้างและได้รับ session id
2. ส่งให้ผู้ตรวจสอบ
   - ผู้ตรวจสอบได้รับแจ้งและสามารถดูเอกสาร/ข้อมูลที่แนบ
3. อนุมัติ/ปฏิเสธ
   - เมื่ออนุมัติ เรียกใช้งาน integration เพื่อมอบเงิน (หรือสร้าง payment request ใน PSAistudio)
4. ปิด session
   - บันทึกเหตุการณ์และสถานะสุดท้าย

## การทดสอบ webhook/integration
- Mock ระบบชำระเงินเพื่อส่ง callback ไปยัง endpoint ของเรา
- ตรวจสอบการอัพเดตสถานะและการบันทึก audit

## ข้อปฏิบัติเมื่อเกิดปัญหา
- หาก callback ไม่เข้ามา: ตรวจสอบ logs และสถานะของ integration
- หาก session ค้าง: ตรวจสอบ locks/concurrency และ manual override ใน admin
- หากต้อง revert: ใช้กระบวนการ refund/compensation ที่กำหนดไว้

---

หมายเหตุ: คู่มือนี้เป็นแนวทางการทดสอบการทำงาน ไม่รวมขั้นตอนการตั้งค่า infrastructure/credentials ที่เป็นความลับ