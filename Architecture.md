# PSAistudio Payment Website SaaS - Architecture Overview 
  
 ## System Architecture 
  
 ```mermaid 
 graph TB 
     subgraph Client["Client Layer"] 
         WEB["Web Browser"] 
         MOBILE["Mobile App"] 
     end 
  
     subgraph Frontend["Frontend Layer - TypeScript"] 
         UI["User Interface<br/>React/Vue Components"] 
         AUTH["Authentication<br/>Module"] 
         PAYMENT_UI["Payment UI<br/>Forms & Components"] 
     end 
  
     subgraph API["API Layer"] 
         REST["REST API<br/>Endpoints"] 
         VALIDATION["Request<br/>Validation"] 
         MIDDLEWARE["Middleware<br/>& Auth"] 
     end 
  
     subgraph Business["Business Logic Layer - TypeScript"] 
         PAYMENT_SERVICE["Payment<br/>Service"] 
         USER_SERVICE["User<br/>Service"] 
         INVOICE_SERVICE["Invoice<br/>Service"] 
         ORDER_SERVICE["Order<br/>Service"] 
     end 
  
     subgraph Database["Data Layer - PLpgSQL"] 
         POSTGRES["PostgreSQL<br/>Database"] 
         PROCEDURES["Stored<br/>Procedures"] 
         TRANSACTIONS["Transaction<br/>Management"] 
     end 
  
     subgraph External["External Services"] 
         PAYMENT_GATEWAY["Payment Gateway<br/>Integration"] 
         EMAIL_SERVICE["Email<br/>Service"] 
         NOTIFICATION["Notification<br/>Service"] 
     end 
  
     subgraph Infrastructure["Infrastructure"] 
         CACHE["Redis/Cache"] 
         LOGGING["Logging &<br/>Monitoring"] 
         SECURITY["Security<br/>Layer"] 
     end 
  
     WEB -->|HTTP/HTTPS| UI 
     MOBILE -->|API| REST 
     UI -->|API Calls| REST 
     REST --> MIDDLEWARE 
     MIDDLEWARE --> VALIDATION 
     VALIDATION --> PAYMENT_SERVICE 
     VALIDATION --> USER_SERVICE 
     VALIDATION --> INVOICE_SERVICE 
     VALIDATION --> ORDER_SERVICE 
      
     PAYMENT_SERVICE -->|Query/Insert| POSTGRES 
     USER_SERVICE -->|Query/Insert| POSTGRES 
     INVOICE_SERVICE -->|Query/Insert| POSTGRES 
     ORDER_SERVICE -->|Query/Insert| POSTGRES 
      
     POSTGRES --> PROCEDURES 
     PROCEDURES --> TRANSACTIONS 
      
     PAYMENT_SERVICE -->|Process| PAYMENT_GATEWAY 
     PAYMENT_SERVICE -->|Send| EMAIL_SERVICE 
     USER_SERVICE -->|Notify| NOTIFICATION 
      
     MIDDLEWARE --> SECURITY 
     REST --> CACHE 
     PAYMENT_SERVICE --> LOGGING 
     USER_SERVICE --> LOGGING 
 # Member Contribution Platform — Architecture Document v1 
  
 ## 1. ER Diagram 
  
 ``` 
 ┌─────────────────┐       ┌──────────────────────────┐ 
 │     members      │       │    payment_methods        │ 
 ├─────────────────┤       ├──────────────────────────┤ 
 │ id (PK)         │       │ id (PK)                  │ 
 │ username        │       │ method_type (ENUM)        │ 
 │ email           │       │ account_name             │ 
 │ password_hash   │       │ account_no               │ 
 │ status (ENUM)   │       │ is_active                │ 
 │ created_at      │       │ created_at               │ 
 └────────┬────────┘       └────────────┬─────────────┘ 
          │                             │ 
          │ 1                           │ 1 
          │                             │ 
          │ N                           │ N 
 ┌────────▼─────────────────────────────▼──────────────┐ 
 │              contribution_requests                   │ 
 ├─────────────────────────────────────────────────────┤ 
 │ id (PK)                                             │ 
 │ member_id (FK → members.id)                         │ 
 │ payment_method_id (FK → payment_methods.id)         │ 
 │ amount (DECIMAL 12,2)                               │ 
 │ reference_code (UNIQUE)                             │ 
 │ status (ENUM: WAITING|PAID|EXPIRED|CANCELLED)       │ 
 │ expires_at                                          │ 
 │ paid_at                                             │ 
 │ created_at                                          │ 
 └──────────────────────────┬──────────────────────────┘ 
                            │ 1 
                            │ N 
               ┌────────────▼─────────────┐ 
               │       qr_sessions        │ 
               ├─────────────────────────┤ 
               │ id (PK)                 │ 
               │ request_id (FK)         │ 
               │ qr_data                 │ 
               │ expires_at              │ 
               │ created_at              │ 
               └─────────────────────────┘ 
  
 ┌─────────────────────────┐ 
 │      activity_logs       │ 
 ├─────────────────────────┤ 
 │ id (PK)                 │ 
 │ user_id                 │ 
 │ action                  │ 
 │ ip_address              │ 
 │ created_at              │ 
 └─────────────────────────┘ 
 ``` 
  
 **Relationships:** 
 - `members` 1:N `contribution_requests` 
 - `payment_methods` 1:N `contribution_requests` 
 - `contribution_requests` 1:1 `qr_sessions` 
 - `activity_logs` — `user_id` is a logical reference, not a hard FK 
  
 --- 
  
 ## 2. Sequence Diagram 
  
 ### 2.1 Create Contribution Request 
  
 ``` 
 Member → Frontend → API Gateway → Contribution Svc → QR Svc → DB → Redis 
   │─POST /contrib─▶│─────────────▶│────────────────▶│          │     │ 
   │  {amount:1}    │              │──Validate──────▶│          │     │ 
   │                │              │──INSERT request─▶│          │     │ 
   │                │              │◀──id, ref_code──│          │     │ 
   │                │              │──Generate QR───▶│          │     │ 
   │                │              │◀──qr_data───────│          │     │ 
   │                │              │──INSERT session─▶│          │     │ 
   │                │              │──SET TTL 5min──────────────────▶│ 
   │◀───QR + status──────────────│◀────────────────│          │     │ 
 ``` 
  
 ### 2.2 Expiration Flow 
  
 ``` 
 Scheduler → DB → Redis 
   │──SELECT WHERE status=WAITING AND expires_at < NOW()──▶│ 
   │◀──expired rows─────────────────────────────────────────│ 
   │──BATCH UPDATE status=EXPIRED──▶│ 
   │──DEL session keys─────────────────────────────────────▶│ 
 ``` 
  
 ### 2.3 Payment Confirmation Flow 
  
 ``` 
 Webhook → Payment Svc → Contribution Svc → QR Svc → DB 
   │─payment event─▶│                │              │       │ 
   │                │──Verify sig───▶│              │       │ 
   │                │               │──UPDATE PAID─▶│       │ 
   │                │               │──Close sess──▶│       │ 
   │                │               │──INSERT log──▶│       │ 
 ``` 
  
 --- 
  
 ## 3. Microservice Design 
  
  ``` 
                          ┌──────────────┐ 
                          │  API Gateway │ (Rate Limit / Auth / Route) 
                          └──────┬───────┘ 
            ┌────────────────────┼────────────────────┐ 
            │                    │                    │ 
     ┌──────▼──────┐     ┌──────▼──────┐     ┌──────▼──────┐ 
     │  Auth Svc   │     │Contribution │     │   Admin     │ 
     │             │     │    Svc      │     │    Svc      │ 
     │ - register  │     │ - create    │     │ - dashboard │ 
     │ - login     │     │ - list      │     │ - members   │ 
     │ - logout    │     │ - cancel    │     │ - methods   │ 
     │ - JWT issue │     │ - status    │     │ - reports   │ 
     └──────┬──────┘     └──────┬──────┘     └──────┬──────┘ 
            │             ┌──────▼──────┐             │ 
            │             │   QR Svc   │             │ 
            │             │ - generate │             │ 
            │             │ - validate │             │ 
            │             │ - expire   │             │ 
            │             └──────┬──────┘             │ 
     ┌──────▼────────────────────▼────────────────────▼──────┐ 
     │                    Shared Layer                        │ 
     │  ┌──────────┐  ┌─────────┐  ┌───────────────────┐    │ 
     │  │PostgreSQL│  │  Redis  │  │ Activity Log Svc  │    │ 
     │  └──────────┘  └─────────┘  └───────────────────┘    │ 
     └───────────────────────────────────────────────────────┘ 
     ┌─────────────────┐ 
     │ Scheduler Svc   │  (Cron: expire stale sessions) 
     └─────────────────┘ 
 ``` 
  
 **Service Boundaries:** 
  
 | Service | Responsibility | Data Owned | 
 |---|---|---| 
 | Auth | Registration, login, JWT, password reset | `members` | 
 | Contribution | Request lifecycle (create, cancel, status) | `contribution_requests` | 
 | QR | QR generation, session management, TTL enforcement | `qr_sessions` | 
 | Admin | Dashboard, member management, payment method management | cross-cutting reads | 
 | Scheduler | Expire stale requests, clean up sessions | write to `contribution_requests`, `qr_sessions` | 
 | Activity Log | Audit trail for all actions | `activity_logs` | 
  
 --- 
  
 ## 4. Database Optimization 
  
 **Indexes:** 
  
 ```sql 
 CREATE INDEX idx_cr_member_id      ON contribution_requests(member_id); 
 CREATE INDEX idx_cr_status_expires ON contribution_requests(status, expires_at); 
 CREATE INDEX idx_cr_reference_code ON contribution_requests(reference_code); 
 CREATE INDEX idx_cr_created_at     ON contribution_requests(created_at DESC); 
 CREATE INDEX idx_qs_request_id     ON qr_sessions(request_id); 
 CREATE INDEX idx_qs_expires_at     ON qr_sessions(expires_at); 
 CREATE UNIQUE INDEX idx_m_email    ON members(email); 
 CREATE UNIQUE INDEX idx_m_username ON members(username); 
 CREATE INDEX idx_al_user_id        ON activity_logs(user_id); 
 CREATE INDEX idx_al_created_at     ON activity_logs(created_at DESC); 
 ``` 
  
 **Partitioning:** Range-partition `contribution_requests` and `activity_logs` by `created_at` (monthly). 
  
 **Redis caching:** 
 - `qr:session:{request_id}` — 5-min TTL 
 - `ratelimit:{member_id}` — sliding window 
 - `member:{id}` — 10-min TTL 
  
 --- 
 
 
 ## Technology Stack 
  
 | Layer | Technology | Language | 
 |-------|-----------|----------| 
 | **Frontend** | React/Vue, TypeScript, HTML/CSS | TypeScript (91%) | 
 | **Backend** | Node.js/Express, TypeScript | TypeScript (91%) | 
 | **Database** | PostgreSQL | PLpgSQL (8.3%) | 
 | **Caching** | Redis | - | 
 | **API** | REST API | TypeScript | 
 | **Authentication** | JWT/OAuth | TypeScript | 
 | **Utilities** | Other Dependencies | Other (0.7%) | 
  
 ## Key Components 
  
 ### Frontend Layer (TypeScript) 
 - User interface for payment processing 
 - Authentication module for user management 
 - Payment forms and transaction displays 
 - Real-time order tracking 
  
 ### Backend Layer (TypeScript) 
 - **Payment Service**: Handles payment processing and gateway integration 
 - **User Service**: Manages user accounts and profiles 
 - **Invoice Service**: Generates and manages invoices 
 - **Order Service**: Handles order creation and status management 
  
 ### Database Layer (PostgreSQL with PLpgSQL) 
 - Transaction management with ACID compliance 
 - Stored procedures for complex operations 
 - Data integrity and consistency 
 - Secure payment data storage 
  
 ### External Integrations 
 - Payment gateway for credit/debit card processing 
 - Email service for transaction notifications 
 - Notification service for real-time updates 
  
 ### Infrastructure 
 - Redis for caching and session management 
 - Logging and monitoring systems 
 - Security layer for data protection 
  
 ## Data Flow 
  
 1. **User Login**: Client → Authentication Module → User Service → PostgreSQL 
 2. **Payment Creation**: Payment UI → Payment Service → Payment Gateway → Database 
 3. **Invoice Generation**: Order Service → Invoice Service → Email Service → User 
 4. **Transaction Confirmation**: Payment Gateway → Payment Service → Notification Service → User 
 ## 5. Security Design 
  
 - JWT: 15-min access + 7-day refresh (rotation in Redis) 
 - Role-based access: MEMBER vs ADMIN 
 - Amount validation: min 1, max 1,000,000 
 - Parameterized queries via TypeORM 
 - Rate limiting: 5 contributions/min, 5 login attempts/15 min 
 - QR contains only reference_code (no PII) 
 - Password: bcrypt cost 12 
 - PII at rest: AES-256-GCM 
 - TLS 1.3 in transit 
 - Audit logging via ActivityLogInterceptor 
  
 --- 
  
 ## 6. NestJS Architecture 
  
 ``` 
 src/ 
 ├── main.ts 
 ├── app.module.ts 
 ├── auth/ 
 │   ├── auth.module.ts 
 │   ├── auth.controller.ts 
 │   ├── auth.service.ts 
 │   ├── strategies/ 
 │   ├── guards/ 
 │   └── dto/ 
 ├── members/ 
 │   ├── members.module.ts 
 │   ├── members.controller.ts 
 │   ├── members.service.ts 
 │   ├── entities/member.entity.ts 
 │   └── dto/ 
 ├── contributions/ 
 │   ├── contributions.module.ts 
 │   ├── contributions.controller.ts 
 │   ├── contributions.service.ts 
 │   ├── entities/contribution-request.entity.ts 
 │   └── dto/ 
 ├── qr/ 
 │   ├── qr.module.ts 
 │   ├── qr.service.ts 
 │   ├── qr.controller.ts 
 │   └── entities/qr-session.entity.ts 
 ├── payment-methods/ 
 │   ├── payment-methods.module.ts 
 │   ├── payment-methods.controller.ts 
 │   ├── payment-methods.service.ts 
 │   └── entities/payment-method.entity.ts 
 ├── admin/ 
 │   ├── admin.module.ts 
 │   ├── admin.controller.ts 
 │   └── admin.service.ts 
 ├── scheduler/ 
 │   ├── scheduler.module.ts 
 │   └── scheduler.service.ts 
 ├── logs/ 
 │   ├── logs.module.ts 
 │   ├── logs.service.ts 
 │   ├── entities/activity-log.entity.ts 
 │   └── interceptors/activity-log.interceptor.ts 
 ├── database/ 
 │   ├── database.module.ts 
 │   └── typeorm.config.ts 
 └── common/ 
     ├── decorators/ 
     ├── filters/ 
     ├── interceptors/ 
     ├── pipes/ 
     └── interfaces/ 
 ``` 
  
 **Key decisions:** 
  
 | Decision | Rationale | 
 |---|---| 
 | TypeORM + PostgreSQL | Mature NestJS integration, migration support | 
 | Redis via @nestjs/cache-manager | Session TTL, rate limiting, refresh tokens | 
 | @nestjs/schedule | Native cron for expiry scheduler | 
 | Passport JWT strategy | Standard NestJS auth pattern | 
 | Global ValidationPipe | Automatic DTO validation | 
 | ActivityLogInterceptor | Transparent audit logging | 
 | TransformInterceptor | Uniform response envelope | 
  
 **Environment config:** 
  
 ```env 
 DB_HOST= 
 DB_PORT=5432 
 DB_NAME=member_contribution 
 DB_USER= 
 DB_PASSWORD= 
 REDIS_HOST= 
 REDIS_PORT=6379 
 JWT_ACCESS_SECRET= 
 JWT_ACCESS_EXPIRY=15m 
 JWT_REFRESH_SECRET= 
 JWT_REFRESH_EXPIRY=7d 
 ENCRYPTION_KEY= 
 ``` 
 
 
  --- 
 
 
 *Last Updated: 2026-05-21* 
 **Core invariant:** This system is a **Session-Based Contribution Authority** platform — it grants a temporary, revocable right for members to contribute funds, materialized as a time-limited QR session, and automatically destroys that right upon expiry or payment.