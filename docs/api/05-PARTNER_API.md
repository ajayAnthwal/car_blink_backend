# Partner API Documentation

Base URL: `/api`
Required Role: `PARTNER` for all protected routes

This module covers partner profile management, KYC, leads/bids, jobs, warranty issuance, and earnings.

---

## Authentication

### POST /api/auth/register
- Request body:
  ```json
  {
    "fullName": "Test Partner",
    "email": "partner@example.com",
    "phone": "9998887775",
    "password": "Password@123",
    "role": "PARTNER"
  }
  ```
- Response: registered user object + OTP message

### POST /api/auth/verify-otp
- Request body:
  ```json
  {
    "identifier": "partner@example.com",
    "otp": "123456"
  }
  ```
- Response: user object + `accessToken` + `refreshToken`

### POST /api/auth/login
- Request body:
  ```json
  {
    "identifier": "partner@example.com",
    "password": "Password@123"
  }
  ```
- Response: user object + `accessToken` + `refreshToken`

---

# Partner Module APIs

> All routes below are protected by authentication and `ROLES.PARTNER`.

## 1. Partner Profile

### POST /api/partner/profile
- Request body:
  ```json
  {
    "businessName": "CarBlink Garage",
    "businessAddress": "Mumbai, Maharashtra",
    "cityId": "<cityObjectId>",
    "servicesOffered": ["<serviceObjectId1>", "<serviceObjectId2>"],
    "gstNumber": "27ABCDE1234F1Z5"
  }
  ```
- Response: created partner profile

### GET /api/partner/profile
- Response: current partner profile

### PATCH /api/partner/profile
- Request body: any updatable partner profile fields
  ```json
  {
    "businessName": "Updated Garage Name",
    "businessAddress": "Andheri, Mumbai",
    "gstNumber": "27ABCDE1234F1Z5"
  }
  ```
- Response: updated partner profile

---

## 2. KYC

### POST /api/partner/kyc
- Request body:
  ```json
  {
    "documentType": "GST_CERTIFICATE",
    "documentUrl": "https://example.com/docs/gst.pdf"
  }
  ```
- Supported `documentType` values:
  - `GST_CERTIFICATE`
  - `SHOP_LICENSE`
  - `ID_PROOF`
  - `ADDRESS_PROOF`
- Response: created KYC document record

### GET /api/partner/kyc
- Response: list of KYC documents for the logged-in partner

---

## 3. Leads / Bidding

### GET /api/partner/leads
- Query params (optional):
  - `page`: number
  - `limit`: number
- Response: paginated list of available booking leads

### POST /api/partner/bids
- Request body:
  ```json
  {
    "bookingId": "<bookingObjectId>",
    "quotedAmount": 1200,
    "estimatedDuration": "2 hours",
    "notes": "We can service this vehicle today"
  }
  ```
- Response: created bid

### GET /api/partner/bids
- Query params (optional):
  - `status`: filter by bid status
  - `page`: number
  - `limit`: number
- Response: paginated list of partner's bids

### PATCH /api/partner/bids/:id/withdraw
- Response: withdrawn bid record

---

## 4. Jobs

### GET /api/partner/jobs
- Query params (optional):
  - `status`: filter by job status
  - `page`: number
  - `limit`: number
- Response: paginated list of partner jobs

### PATCH /api/partner/jobs/:id/start
- Response: job started

### PATCH /api/partner/jobs/:id/complete
- Request body (optional):
  ```json
  {
    "finalAmount": 1500
  }
  ```
- Response: completed job

### POST /api/partner/jobs/:id/invoice
- Request body:
  ```json
  {
    "invoiceUrl": "https://example.com/invoice.pdf"
  }
  ```
- Response: updated job with invoice URL

### POST /api/partner/jobs/:id/photos
- Request body:
  ```json
  {
    "photos": [
      "https://example.com/before1.jpg",
      "https://example.com/before2.jpg"
    ],
    "type": "before"
  }
  ```
- `type` values:
  - `before`
  - `after`
- Response: updated job record with photos synced to booking

### POST /api/partner/jobs/:id/warranty
- Request body:
  ```json
  {
    "warrantyPeriodMonths": 6,
    "warrantyDocumentUrl": "https://example.com/warranty.pdf"
  }
  ```
- Response: created warranty document for the completed job

---

## 5. Earnings

### GET /api/partner/earnings
- Query params (optional):
  - `period`: `today` | `week` | `month`
- Response: partner earnings for selected period

### GET /api/partner/earnings/summary
- Response: lifetime earnings summary + completed jobs count

---

# Response format

Successful responses follow:
```json
{
  "success": true,
  "message": "string",
  "data": { ... }
}
```

---

# Frontend sidebar / nav suggestions for PARTNER

- Dashboard / Home
- My Profile
- KYC
- Leads
- My Bids
- My Jobs
- Upload Invoice / Photos
- Warranty
- Earnings
- Earnings Summary
