Member Contribution Platform (MCP)

Project Overview

Member Contribution Platform (MCP) คือแพลตฟอร์มสำหรับจัดการการมอบเงินจากสมาชิกไปยังเจ้าของระบบผ่านคำขอแบบชั่วคราว (Temporary Contribution Request)

ระบบนี้ถูกออกแบบให้ไม่มีช่องทางรับเงินค้างถาวรสำหรับการทำรายการแต่ละครั้ง

สมาชิกจะต้องเป็นผู้เริ่มต้นสร้างคำขอมอบเงินด้วยตนเอง โดยระบุจำนวนเงินที่ต้องการมอบ จากนั้นระบบจะสร้าง Session การมอบเงินชั่วคราว พร้อมช่องทางสำหรับดำเนินการตามคำขอนั้น

ทุก Session จะมีวันหมดอายุ (Expiration Time)

เมื่อหมดเวลา ระบบจะปิด Session อัตโนมัติ และไม่อนุญาตให้ใช้ Session เดิมซ้ำอีก

---

Business Objectives

1. รองรับสมาชิกมากกว่า 10,000 คน
2. จัดการคำขอมอบเงินจำนวนมากพร้อมกัน
3. ลดปัญหาการใช้รายการซ้ำ
4. ควบคุมอายุของคำขอแต่ละรายการ
5. บันทึกประวัติการใช้งานทั้งหมด
6. รองรับการขยายระบบในอนาคต

---

User Roles

Administrator

เจ้าของระบบ

สิทธิ์

- จัดการสมาชิก
- จัดการช่องทางรับเงิน
- ดู Dashboard
- ดู Logs
- ดู Statistics
- เปิด/ปิดช่องทางรับเงิน
- ตรวจสอบคำขอทั้งหมด

---

Member

สมาชิกภายในระบบ

สิทธิ์

- สมัครสมาชิก
- เข้าสู่ระบบ
- สร้างคำขอมอบเงิน
- ดูสถานะคำขอ
- ดูประวัติรายการ
- ยกเลิกคำขอ

---

Core Concept

ระบบทำงานในรูปแบบ Request-Based Architecture

สมาชิกต้องสร้าง Request ก่อน

ตัวอย่าง

Member

↓

Create Contribution Request

↓

Generate Session

↓

Generate Contribution Channel

↓

Waiting

↓

Paid / Expired / Cancelled

---

Contribution Request Lifecycle

WAITING

คำขอถูกสร้างแล้ว

กำลังรอการดำเนินการ

↓

PAID

ดำเนินการสำเร็จ

↓

EXPIRED

หมดอายุ

↓

CANCELLED

ถูกยกเลิก

---

Session Rules

Session ทุกตัวต้องมี

- Request ID
- Member ID
- Amount
- Expiration Time
- Status

ข้อกำหนด

1 Session = 1 Request

1 Request = ใช้งานได้ครั้งเดียว

Session หมดอายุแล้วไม่สามารถกลับมาใช้งานได้อีก

---

Functional Requirements

Authentication Module

Features

- Register
- Login
- Logout
- Change Password
- Reset Password
- JWT Authentication
- Refresh Token

---

Member Module

Features

- View Profile
- Update Profile
- Change Password
- View Activity History

---

Contribution Module

Features

- Create Request
- Cancel Request
- View Request
- View History
- Filter Requests
- Search Requests

Fields

- Amount
- Request ID
- Status
- Created Time
- Expired Time

---

Session Module

Features

- Generate Session
- Validate Session
- Expire Session
- Close Session

Validation

- Not Expired
- Not Cancelled
- Not Paid
- Status Must Be WAITING

---

Dashboard Module

Administrator Dashboard

Features

- Total Members
- Active Members
- Total Requests
- Paid Requests
- Expired Requests
- Cancelled Requests
- Daily Statistics
- Monthly Statistics

---

Logs Module

Features

- Login Logs
- Activity Logs
- Request Logs
- Security Logs
- Admin Logs

---

Non Functional Requirements

Performance

Target Members

10,000+

Target Concurrent Users

500+

Target API Response

< 500 ms

---

Security

Password Hashing

bcrypt

Authentication

JWT

Role Control

RBAC

Rate Limiting

Enabled

Audit Logging

Enabled

IP Logging

Enabled

Session Validation

Enabled

---

Availability

Target Uptime

99.9%

---

Scalability

Horizontal Scaling Supported

Stateless Backend

Redis Shared Cache

PostgreSQL Cluster Ready

---

Suggested Technology Stack

Backend

NestJS

Node.js

TypeScript

Database

PostgreSQL

Cache

Redis

Authentication

JWT

bcrypt

Container

Docker

Reverse Proxy

Nginx

Monitoring

Prometheus

Grafana

Logging

Winston

---

Project Structure

src/

auth/

members/

contributions/

sessions/

dashboard/

admin/

logs/

notifications/

database/

common/

config/

middlewares/

guards/

interceptors/

jobs/

main.ts

---

Scheduled Jobs

Expiration Worker

ทำงานทุก 60 วินาที

หน้าที่

ค้นหา Request ที่หมดอายุ

เงื่อนไข

Status = WAITING

Expiration Time < Current Time

ผลลัพธ์

เปลี่ยนสถานะเป็น EXPIRED

ปิด Session

บันทึก Log

---

Future Expansion

Notification System

Email Verification

SMS Verification

Push Notification

Mobile Application

Multi Language

Advanced Analytics

Real Time Dashboard

Webhook System

External API Integration

AI Analytics

---

Development Phases

Phase 1

Authentication

Members

Contribution Requests

Dashboard

Logs

---

Phase 2

Notifications

Reporting

Analytics

---

Phase 3

Mobile Application

Public APIs

Third Party Integrations

---

Success Criteria

ระบบสามารถรองรับสมาชิกมากกว่า 10,000 คน

สร้างคำขอได้พร้อมกันจำนวนมาก

Session หมดอายุอัตโนมัติ

บันทึกข้อมูลย้อนหลังได้ครบถ้วน

สามารถขยายระบบในอนาคตได้โดยไม่ต้องเปลี่ยนโครงสร้างหลัก
