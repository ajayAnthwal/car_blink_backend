# Accounts API Documentation

Base URL: `/api`
Required Role: `ACCOUNTS` for all protected routes

This module covers refund handling, partner settlements, and financial reporting for the accounts team.

---

## Authentication

### POST /api/auth/register
- Request body:
  ```json
  {
    "fullName": "Test Accounts User",
    "email": "accounts@example.com",
    "phone": "9998887773",
    "password": "Password@123",
    "role": "ACCOUNTS"
  }
  ```
- Response: registered user object + OTP message

### POST /api/auth/verify-otp
- Request body:
  ```json
  {
    "identifier": "accounts@example.com",
    "otp": "123456"
  }
  ```
- Response: user object + `accessToken` + `refreshToken`

### POST /api/auth/login
- Request body:
  ```json
  {
    "identifier": "accounts@example.com",
    "password": "Password@123"
  }
  ```
- Response: user object + `accessToken` + `refreshToken`

---

# Accounts Module APIs

> All routes below are protected by authentication and `ROLES.ACCOUNTS`.

## 1. Refunds

### GET /api/accounts/refunds
- Query params (optional):
  - `page`: number
  - `limit`: number
  - other filters passed in `req.query`
- Response: paginated list of refunds

### POST /api/accounts/refunds
- Request body:
  ```json
  {
    "paymentId": "<paymentObjectId>",
    "amount": 500,
    "reason": "Customer requested refund"
  }
  ```
- Response: created refund record

### PATCH /api/accounts/refunds/:id/approve
- Response: refund approved

### PATCH /api/accounts/refunds/:id/process
- Response: refund processed

### PATCH /api/accounts/refunds/:id/reject
- Request body:
  ```json
  {
    "rejectionReason": "Refund not eligible"
  }
  ```
- Response: refund rejected

---

## 2. Settlements

### GET /api/accounts/settlements/eligible-jobs
- Query params (optional):
  - `page`: number
  - `limit`: number
- Response: jobs eligible for settlement

### POST /api/accounts/settlements/generate
- Request body:
  ```json
  {
    "jobId": "<jobObjectId>",
    "commissionPercent": 10
  }
  ```
- Response: generated settlement record

### GET /api/accounts/settlements
- Query params (optional):
  - `page`: number
  - `limit`: number
- Response: list of settlements

### PATCH /api/accounts/settlements/:id/process
- Request body:
  ```json
  {
    "transactionReference": "TXN-123456"
  }
  ```
- Response: settlement processed

### GET /api/accounts/settlements/partner/:partnerId
- Query params (optional):
  - `page`: number
  - `limit`: number
- Response: settlement history for a specific partner

---

## 3. Financial Reports

### GET /api/accounts/reports/gst
- Query params (required):
  - `fromDate`: string
  - `toDate`: string
- Response: GST report data

### GET /api/accounts/reports/invoices
- Query params (required):
  - `fromDate`: string
  - `toDate`: string
- Optional filters:
  - `cityId`: string
  - `serviceId`: string
- Response: invoice report data

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

# Frontend sidebar / nav suggestions for ACCOUNTS

- Dashboard / Home
- Refunds
- Settlements
- Reports
- Profile / Account
