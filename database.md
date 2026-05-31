DATABASE.md

Member Contribution Platform

Version 1.0

---

Database Engine

PostgreSQL 16+

Encoding

UTF8

Timezone

UTC

---

Database Overview

Database ถูกออกแบบเพื่อรองรับ

- สมาชิก 10,000+
- Contribution Requests จำนวนมาก
- Session หมดอายุอัตโนมัติ
- Dashboard Analytics
- Audit Logging

---

Entity Relationship Overview

members

↓

contribution_requests

↓

contribution_sessions

↓

activity_logs

---

TABLE: members

เก็บข้อมูลสมาชิก

Fields

id

BIGSERIAL

PRIMARY KEY

---

uuid

UUID

UNIQUE

---

username

VARCHAR(100)

UNIQUE

---

email

VARCHAR(255)

UNIQUE

---

password_hash

TEXT

---

role

ENUM

ADMIN

MEMBER

---

status

ENUM

ACTIVE

SUSPENDED

BANNED

---

last_login_at

TIMESTAMP

NULL

---

created_at

TIMESTAMP

---

updated_at

TIMESTAMP

---

Indexes

username

email

status

---

TABLE: payment_channels

เก็บช่องทางที่เจ้าของระบบเปิดใช้งาน

Fields

id

BIGSERIAL

PRIMARY KEY

---

channel_name

VARCHAR(100)

---

channel_type

VARCHAR(50)

---

account_name

VARCHAR(255)

---

account_reference

VARCHAR(255)

---

status

ENUM

ACTIVE

INACTIVE

---

priority

INTEGER

DEFAULT 0

---

created_at

TIMESTAMP

---

updated_at

TIMESTAMP

---

Indexes

status

priority

---

TABLE: contribution_requests

หัวใจหลักของระบบ

1 Request = 1 การมอบเงิน

Fields

id

BIGSERIAL

PRIMARY KEY

---

request_code

VARCHAR(50)

UNIQUE

---

member_id

BIGINT

FK members.id

---

channel_id

BIGINT

FK payment_channels.id

---

amount

DECIMAL(18,2)

---

currency

VARCHAR(10)

DEFAULT THB

---

status

ENUM

WAITING

PAID

EXPIRED

CANCELLED

---

description

TEXT

NULL

---

created_at

TIMESTAMP

---

expires_at

TIMESTAMP

---

paid_at

TIMESTAMP

NULL

---

cancelled_at

TIMESTAMP

NULL

---

Indexes

member_id

status

created_at

expires_at

request_code

---

TABLE: contribution_sessions

Session ที่เชื่อมกับ Request

Fields

id

BIGSERIAL

PRIMARY KEY

---

request_id

BIGINT

FK contribution_requests.id

---

session_token

VARCHAR(255)

UNIQUE

---

session_status

ENUM

ACTIVE

EXPIRED

CLOSED

---

expires_at

TIMESTAMP

---

closed_at

TIMESTAMP

NULL

---

created_at

TIMESTAMP

---

Indexes

request_id

session_status

expires_at

---

TABLE: contribution_qr

ข้อมูล QR ที่สร้างขึ้น

Fields

id

BIGSERIAL

PRIMARY KEY

---

request_id

BIGINT

FK contribution_requests.id

---

session_id

BIGINT

FK contribution_sessions.id

---

qr_payload

TEXT

---

qr_hash

VARCHAR(255)

---

expires_at

TIMESTAMP

---

created_at

TIMESTAMP

---

Indexes

request_id

session_id

expires_at

---

TABLE: activity_logs

บันทึกกิจกรรม

Fields

id

BIGSERIAL

PRIMARY KEY

---

member_id

BIGINT

NULL

---

action

VARCHAR(255)

---

entity_type

VARCHAR(100)

---

entity_id

BIGINT

---

ip_address

VARCHAR(50)

---

user_agent

TEXT

---

created_at

TIMESTAMP

---

Indexes

member_id

action

created_at

---

TABLE: admin_logs

กิจกรรมของผู้ดูแล

Fields

id

BIGSERIAL

PRIMARY KEY

---

admin_id

BIGINT

FK members.id

---

action

VARCHAR(255)

---

details

JSONB

---

created_at

TIMESTAMP

---

Indexes

admin_id

created_at

---

TABLE: login_logs

ประวัติการเข้าสู่ระบบ

Fields

id

BIGSERIAL

PRIMARY KEY

---

member_id

BIGINT

NULL

---

username

VARCHAR(255)

---

success

BOOLEAN

---

ip_address

VARCHAR(50)

---

user_agent

TEXT

---

created_at

TIMESTAMP

---

Indexes

member_id

success

created_at

---

TABLE: system_settings

ตั้งค่าระบบ

Fields

id

BIGSERIAL

PRIMARY KEY

---

setting_key

VARCHAR(100)

UNIQUE

---

setting_value

TEXT

---

updated_at

TIMESTAMP

---

Examples

REQUEST_EXPIRATION_MINUTES

DEFAULT_CHANNEL

ALLOW_CANCEL_REQUEST

MAX_REQUEST_AMOUNT

MIN_REQUEST_AMOUNT

---

Request Lifecycle

CREATE

↓

WAITING

↓

PAID

OR

↓

EXPIRED

OR

↓

CANCELLED

---

Session Lifecycle

ACTIVE

↓

EXPIRED

OR

↓

CLOSED

---

Recommended Index Strategy

BTREE

member_id

request_code

status

expires_at

created_at

session_status

---

Recommended Retention

Contribution Requests

7 Years

Logs

1 Year

Sessions

180 Days

QR Records

180 Days

---

Expected Capacity

Members

10,000+

Requests

10,000,000+

Logs

100,000,000+

Database Size

50GB - 500GB+

Scalable

YES