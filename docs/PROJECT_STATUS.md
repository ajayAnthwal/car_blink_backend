# CarBlink Backend — Project Status
Last audited: July 15, 2026

---

## ⚠️ Issues / Inconsistencies Found
1. **Empty Top-Level Placeholder Files**:
   - The top-level files [customer.controller.ts](file:///c:/Users/ajay%20anthwal/Desktop/car_blink_backend/src/modules/customer/customer.controller.ts), [customer.service.ts](file:///c:/Users/ajay%20anthwal/Desktop/car_blink_backend/src/modules/customer/customer.service.ts), and [customer.validation.ts](file:///c:/Users/ajay%20anthwal/Desktop/car_blink_backend/src/modules/customer/customer.validation.ts) are empty (0 bytes). This is because all business logic and validations have been modularized into sub-module folders (`garage`, `booking`, `warranty`, `support-ticket`) according to the layered design.

---

## 1. Overall Progress Summary

| Step # | Module | Status | Notes |
| :---: | :--- | :---: | :--- |
| **1** | Core Setup & Config | ✅ Complete | Express server, Winston logs, MongoDB connection, CORS, and Zod env validation active. |
| **2** | Common Utilities | ✅ Complete | Type-safe JSON response helpers, custom ApiError classes, and async wrapper utilities. |
| **3** | Master-Data Module | ✅ Complete | Reference schemas (Service, City, VehicleBrand, VehicleModel) with seeders. |
| **4** | Authentication Module | ✅ Complete | Session checks via JWT (Access + Refresh), in-memory OTP validation with console logger notifications, and Super Admin seeder. |
| **5** | User Profile Module | ✅ Complete | Profile retrieval, update, password change with confirmation checks, and self-deactivation. |
| **6** | Upload Module | ✅ Complete | Multer memory storage stream piping directly into Cloudinary v2 SDK. |
| **7** | Customer Module | ✅ Complete | Garage CRUD, booking lead creation, read-only warranties, support tickets and replies, with strict service-level ownership checks and role-based access checks. |
| **8** | Partner Module (Bidding) | ✅ Complete | Profile setup, KYC uploads, bidding flow, job execution, and earnings aggregation. |
| **9** | Jobs (Cron) & Sockets | ⬜ Not Started | Scheduled bookings verification and real-time bid sockets notifications. |

---

## 2. Fully Implemented API Endpoints

### Authentication (mounted at `/api/auth`)
| Method | Endpoint | Auth Required | Role Restriction | Request Body/Params | Status |
| :---: | :--- | :---: | :--- | :--- | :---: |
| POST | `/api/auth/register` | No | `CUSTOMER` / `PARTNER` only | `fullName`, `email`, `phone`, `password`, `role` | ✅ Working |
| POST | `/api/auth/verify-otp` | No | None | `identifier`, `otp` | ✅ Working |
| POST | `/api/auth/login` | No | None (rate limited) | `identifier`, `password` | ✅ Working |
| POST | `/api/auth/refresh-token` | No | None | `refreshToken` | ✅ Working |
| POST | `/api/auth/logout` | Yes | Any role | None | ✅ Working |
| POST | `/api/auth/forgot-password` | No | None (rate limited) | `identifier` | ✅ Working |
| POST | `/api/auth/reset-password` | No | None | `identifier`, `token`, `newPassword` | ✅ Working |
| GET | `/api/auth/me` | Yes | Any role | None | ✅ Working |

### User Profile Management (mounted at `/api/users`)
| Method | Endpoint | Auth Required | Role Restriction | Request Body/Params | Status |
| :---: | :--- | :---: | :--- | :--- | :---: |
| GET | `/api/users/profile` | Yes | Any role | None | ✅ Working |
| PATCH | `/api/users/profile` | Yes | Any role | `fullName` (optional), `profileImage` (optional) | ✅ Working |
| PATCH | `/api/users/change-password` | Yes | Any role | `currentPassword`, `newPassword`, `confirmNewPassword` | ✅ Working |
| PATCH | `/api/users/deactivate` | Yes | Any role | None | ✅ Working |

### Upload Management (mounted at `/api/upload`)
| Method | Endpoint | Auth Required | Role Restriction | Request Body/Params | Status |
| :---: | :--- | :---: | :--- | :--- | :---: |
| POST | `/api/upload` | Yes | Any role | `file` (multipart form field), `folder` (optional body field) | ✅ Working |

### Master Data (mounted at `/api/`)
| Method | Endpoint | Auth Required | Role Restriction | Request Body/Params | Status |
| :---: | :--- | :--- | :--- | :--- | :---: |
| GET | `/api/services` | No | None | None | ✅ Working |
| GET | `/api/cities` | No | None | None | ✅ Working |
| GET | `/api/vehicle-brands` | No | None | None | ✅ Working |
| GET | `/api/vehicle-models` | No | None | None | ✅ Working |
| POST | `/api/services` | Yes | `SUPER_ADMIN` | `name`, `icon`, `category` (optional) | ✅ Working |
| PATCH | `/api/services/:id` | Yes | `SUPER_ADMIN` | `name`, `icon`, `category`, `isActive` (optional) | ✅ Working |
| DELETE | `/api/services/:id` | Yes | `SUPER_ADMIN` | None (URL parameter `:id`) | ✅ Working |
| POST | `/api/cities` | Yes | `SUPER_ADMIN` | `name`, `state` | ✅ Working |
| PATCH | `/api/cities/:id` | Yes | `SUPER_ADMIN` | `name`, `state`, `isActive` (optional) | ✅ Working |
| DELETE | `/api/cities/:id` | Yes | `SUPER_ADMIN` | None (URL parameter `:id`) | ✅ Working |
| POST | `/api/vehicle-brands` | Yes | `SUPER_ADMIN` | `name`, `logo` (optional) | ✅ Working |
| POST | `/api/vehicle-models` | Yes | `SUPER_ADMIN` | `brandId`, `name` | ✅ Working |

### Customer Module (mounted at `/api/customer`)
| Method | Endpoint | Auth Required | Role Restriction | Request Body/Params | Status |
| :---: | :--- | :---: | :--- | :--- | :---: |
| POST | `/api/customer/garage` | Yes | `CUSTOMER` | `brand`, `model`, `registrationNumber`, `fuelType`, `year` | ✅ Working |
| GET | `/api/customer/garage` | Yes | `CUSTOMER` | None | ✅ Working |
| PATCH | `/api/customer/garage/:id` | Yes | `CUSTOMER` | `brand`/`model`/`registrationNumber`/`fuelType`/`year` | ✅ Working |
| DELETE | `/api/customer/garage/:id` | Yes | `CUSTOMER` | None | ✅ Working |
| POST | `/api/customer/bookings` | Yes | `CUSTOMER` | `vehicleId`, `serviceId`, `cityId`, `description`, `preferredDate` | ✅ Working |
| GET | `/api/customer/bookings` | Yes | `CUSTOMER` | Query params: `status`, `page`, `limit` | ✅ Working |
| GET | `/api/customer/bookings/:id` | Yes | `CUSTOMER` | None | ✅ Working |
| PATCH | `/api/customer/bookings/:id/cancel` | Yes | `CUSTOMER` | `reason` | ✅ Working |
| GET | `/api/customer/bookings/:id/quotes` | Yes | `CUSTOMER` | None | ✅ Working |
| POST | `/api/customer/bookings/:id/select-quote` | Yes | `CUSTOMER` | `bidId` | ✅ Working |
| GET | `/api/customer/warranties` | Yes | `CUSTOMER` | Query params: `page`, `limit` | ✅ Working |
| GET | `/api/customer/warranties/:id` | Yes | `CUSTOMER` | None | ✅ Working |
| POST | `/api/customer/support-tickets` | Yes | `CUSTOMER` | `bookingId` (optional), `subject`, `description`, `priority` | ✅ Working |
| GET | `/api/customer/support-tickets` | Yes | `CUSTOMER` | Query params: `page`, `limit` | ✅ Working |
| GET | `/api/customer/support-tickets/:id` | Yes | `CUSTOMER` | None | ✅ Working |
| POST | `/api/customer/support-tickets/:id/reply` | Yes | `CUSTOMER` | `message` | ✅ Working |

### Partner Module (mounted at `/api/partner`)
| Method | Endpoint | Auth Required | Role Restriction | Request Body/Params | Status |
| :---: | :--- | :---: | :--- | :--- | :---: |
| POST | `/api/partner/profile` | Yes | `PARTNER` | `businessName`, `businessAddress`, `cityId`, `servicesOffered`, `gstNumber` | ✅ Working |
| GET | `/api/partner/profile` | Yes | `PARTNER` | None | ✅ Working |
| PATCH | `/api/partner/profile` | Yes | `PARTNER` | `businessName`/`businessAddress`/`cityId`/`servicesOffered`/`gstNumber` | ✅ Working |
| POST | `/api/partner/kyc` | Yes | `PARTNER` | `documentType`, `documentUrl` | ✅ Working |
| GET | `/api/partner/kyc` | Yes | `PARTNER` | None | ✅ Working |
| GET | `/api/partner/leads` | Yes | `PARTNER` | Query params: `page`, `limit` | ✅ Working |
| POST | `/api/partner/bids` | Yes | `PARTNER` | `bookingId`, `quotedAmount`, `estimatedDuration`, `notes` | ✅ Working |
| GET | `/api/partner/bids` | Yes | `PARTNER` | Query params: `status`, `page`, `limit` | ✅ Working |
| PATCH | `/api/partner/bids/:id/withdraw` | Yes | `PARTNER` | None | ✅ Working |
| GET | `/api/partner/jobs` | Yes | `PARTNER` | Query params: `status`, `page`, `limit` | ✅ Working |
| PATCH | `/api/partner/jobs/:id/start` | Yes | `PARTNER` | None | ✅ Working |
| PATCH | `/api/partner/jobs/:id/complete` | Yes | `PARTNER` | `finalAmount` (optional) | ✅ Working |
| POST | `/api/partner/jobs/:id/invoice` | Yes | `PARTNER` | `invoiceUrl` | ✅ Working |
| POST | `/api/partner/jobs/:id/photos` | Yes | `PARTNER` | `photos` (array), `type` ('before'/'after') | ✅ Working |
| POST | `/api/partner/jobs/:id/warranty` | Yes | `PARTNER` | `warrantyPeriodMonths`, `warrantyDocumentUrl` | ✅ Working |
| GET | `/api/partner/earnings` | Yes | `PARTNER` | Query params: `period` ('today'/'week'/'month') | ✅ Working |
| GET | `/api/partner/earnings/summary` | Yes | `PARTNER` | None | ✅ Working |

---

## 3. Database Models Implemented

- **User** ([user.model.ts](file:///c:/Users/ajay%20anthwal/Desktop/car_blink_backend/src/modules/user/user.model.ts)): Shared user document containing authentication and profile details; implements pre-save password-hashing hooks and instance method `comparePassword`.
- **Service** ([service.model.ts](file:///c:/Users/ajay%20anthwal/Desktop/car_blink_backend/src/modules/master-data/models/service.model.ts)): Platform service category listing, unique by name.
- **City** ([city.model.ts](file:///c:/Users/ajay%20anthwal/Desktop/car_blink_backend/src/modules/master-data/models/city.model.ts)): List of operational cities, unique by name.
- **VehicleBrand** ([vehicle.model.ts](file:///c:/Users/ajay%20anthwal/Desktop/car_blink_backend/src/modules/master-data/models/vehicle.model.ts)): Vehicle brands (e.g. Maruti, Honda), unique by name.
- **VehicleModel** ([vehicle.model.ts](file:///c:/Users/ajay%20anthwal/Desktop/car_blink_backend/src/modules/master-data/models/vehicle.model.ts)): Model variations with `brandId` ref; compound unique index on `{ brandId, name }`.
- **Garage** ([garage.model.ts](file:///c:/Users/ajay%20anthwal/Desktop/car_blink_backend/src/modules/customer/sub-modules/garage/garage.model.ts)): Customer vehicle records, links to `User` via `customerId`.
- **Booking** ([booking.model.ts](file:///c:/Users/ajay%20anthwal/Desktop/car_blink_backend/src/modules/customer/sub-modules/booking/booking.model.ts)): Core requested services (leads) referencing `User`, `Garage`, `Service`, and `City`; compound index on `{ customerId, status }` and `{ cityId, serviceId, status }`.
- **Warranty** ([warranty.model.ts](file:///c:/Users/ajay%20anthwal/Desktop/car_blink_backend/src/modules/customer/sub-modules/warranty/warranty.model.ts)): Record of warranties linked to `Booking` and `User`. Auto-calculates `expiryDate` via pre-save middleware.
- **SupportTicket** ([ticket.model.ts](file:///c:/Users/ajay%20anthwal/Desktop/car_blink_backend/src/modules/customer/sub-modules/support-ticket/ticket.model.ts)): Support tickets containing a thread of message subdocuments.
- **Partner** ([partner.model.ts](file:///c:/Users/ajay%20anthwal/Desktop/car_blink_backend/src/modules/partner/partner.model.ts)): Partner profile details including businessName, businessAddress, cityId ref, servicesOffered refs, verification status, and rating.
- **KycDocument** ([kyc.model.ts](file:///c:/Users/ajay%20anthwal/Desktop/car_blink_backend/src/modules/partner/sub-modules/kyc/kyc.model.ts)): KYC documents submitted by partners.
- **Bid** ([bid.model.ts](file:///c:/Users/ajay%20anthwal/Desktop/car_blink_backend/src/modules/partner/sub-modules/bidding/bid.model.ts)): Bids/quotes placed by partners on customer bookings; compound unique index on `{ bookingId, partnerId }`.
- **Job** ([job.model.ts](file:///c:/Users/ajay%20anthwal/Desktop/car_blink_backend/src/modules/partner/sub-modules/jobs/job.model.ts)): Job execution records including status, photos, invoices, and final amounts.

---

## 4. Known Gaps / Deferred Functionality

- **No current business logic gaps**: All deferred functions `getQuotesForBooking` and `selectQuote`, along with the Partner-side job auto-creation and warranty issuing flows, are fully implemented.
- **TODO Comments**:
  1. [auth.service.ts:149](file:///c:/Users/ajay%20anthwal/Desktop/car_blink_backend/src/modules/auth/auth.service.ts#L149): `// TODO: blacklist tokens or clear session if using Redis` (Logout session blacklist logic).
  2. [otp.strategy.ts:17](file:///c:/Users/ajay%20anthwal/Desktop/car_blink_backend/src/modules/auth/strategies/otp.strategy.ts#L17): `// TODO: integrate real SMS/Email provider in notification module` (SMS OTP routing).

---

## 5. Infrastructure / Config Status

- **Database**: MongoDB Atlas Cluster connection configured in [database.config.ts](file:///c:/Users/ajay%20anthwal/Desktop/car_blink_backend/src/config/database.config.ts).
- **File Storage**: Cloudinary (memory storage buffers routed directly through the Cloudinary v2 SDK) in [upload.service.ts](file:///c:/Users/ajay%20anthwal/Desktop/car_blink_backend/src/modules/upload/upload.service.ts).
- **Authentication**: JWT signing strategy for Access (15 minutes) and Refresh (7 days) tokens in [jwt.strategy.ts](file:///c:/Users/ajay%20anthwal/Desktop/car_blink_backend/src/modules/auth/strategies/jwt.strategy.ts).
- **OTP Operations**: In-memory `Map` storage with 5-minute TTL in [otp.strategy.ts](file:///c:/Users/ajay%20anthwal/Desktop/car_blink_backend/src/modules/auth/strategies/otp.strategy.ts).
- **Seeded Data**:
  - Services: 15 categories (14 defined in `services.seeder.ts` array + 1 tested category).
  - Cities: 27 cities (all 27 defined in `cities.seeder.ts` array).
  - Internal Users: exactly 1 Super Admin seeded (`admin@carblink.com`) via `npm run seed:internal-users`.
- **Environment Variables** (from [env.config.ts](file:///c:/Users/ajay%20anthwal/Desktop/car_blink_backend/src/config/env.config.ts)):
  - `PORT` (default 8000)
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `JWT_REFRESH_SECRET`
  - `NODE_ENV` (default 'development')
  - `CORS_ORIGIN` (default '*')
  - `REDIS_URL` (optional)
  - `OTP_EXPIRY_MINUTES` (default 5)
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`

---

## 6. Not Yet Started
The following roadmap modules are completely unimplemented:
1. **Executive Module** (Leads, assigned jobs status).
2. **Accounts Module** (Settlements, ledger logs).
3. **Super-Admin Module** (Global configurations, partner validations, analytics).
4. **Payment Module** (Gateway integration, success checks).
5. **Notification Module** (SMS & Email alerts).
6. **Review Module** (Review sub-modules and ratings).
7. **Jobs (Cron)** (Stale job reviews and state transitions).
8. **Sockets** (Real-time live updates).

---

## 7. Architectural Rules Still In Effect

- [ ] **Layered Modular Architecture**: Organize files by module, separating concerns strictly into `model`, `validation`, `service`, `controller`, and `routes`.
- [ ] **Thin Controllers**: Keep controllers thin. They should parse request parameters, call services, and return results. Business logic must live inside services.
- [ ] **Standard Success Response**: Always format success outputs using the type-safe `successResponse` utility (`apiResponse.util.ts`).
- [ ] **Standard Custom Errors**: Propagate exceptions using standard custom error classes (e.g. `ApiError`, `NotFoundError`, `UnauthorizedError`, `ConflictError`).
- [ ] **Async Wrapper**: Always wrap controller handlers in the `asyncHandler` wrapper to ensure unhandled promise rejections are automatically forwarded to the global error middleware.
- [ ] **Request Schema Validation**: Validate all incoming parameters (body, query, params) with Zod using the `validate` middleware.
- [ ] **Role-Based Access Control**: Secure routes using the `roleMiddleware` matching parameters defined in `roles.constant.ts`.
- [ ] **Strict Service Ownership Verification**: Perform resource ownership validation inside the service layer (verifying `customerId` matches `req.user.userId` or returning a `401/403` error) on every database fetch, update, or deletion.
- [ ] **Full Type Safety**: Exclude the `any` type keyword. Make all interface objects explicit and type-safe.
- [ ] **No Code without Prior Alignment**: Always propose design plans and wait for user approval before modifying code.
