# Executive API Documentation

Base URL: `/api`
Required Role: `EXECUTIVE` for all protected routes

This module covers executive workflows for lead assignment, follow-up calls, escalations, and customer/partner status tracking.

---

## Authentication

### POST /api/auth/register
- Request body:
  ```json
  {
    "fullName": "Test Executive",
    "email": "executive@example.com",
    "phone": "9998887774",
    "password": "Password@123",
    "role": "EXECUTIVE"
  }
  ```
- Response: registered user object + OTP message

### POST /api/auth/verify-otp
- Request body:
  ```json
  {
    "identifier": "executive@example.com",
    "otp": "123456"
  }
  ```
- Response: user object + `accessToken` + `refreshToken`

### POST /api/auth/login
- Request body:
  ```json
  {
    "identifier": "executive@example.com",
    "password": "Password@123"
  }
  ```
- Response: user object + `accessToken` + `refreshToken`

---

# Executive Module APIs

> All routes below are protected by authentication and `ROLES.EXECUTIVE`.

## 1. Lead Assignment

### GET /api/executive/leads
- Query params (optional):
  - `page`: number
  - `limit`: number
  - other filters passed through `req.query`
- Response: list of platform leads / bookings available for assignment

### GET /api/executive/leads/:id
- Response: details of one lead / booking

### PATCH /api/executive/leads/:id/assign-partner
- Request body:
  ```json
  {
    "partnerId": "<partnerObjectId>",
    "notes": "Assigned for follow-up"
  }
  ```
- Response: assignment record created/updated

---

## 2. Follow-up Calls

### POST /api/executive/follow-ups
- Request body:
  ```json
  {
    "relatedTo": "CUSTOMER",
    "relatedUserId": "<customerObjectId>",
    "bookingId": "<bookingObjectId>",
    "callOutcome": "CONNECTED",
    "notes": "Customer requested callback",
    "followUpDate": "2026-07-20T10:00:00.000Z"
  }
  ```
- Supported `relatedTo` values:
  - `CUSTOMER`
  - `PARTNER`
- Supported `callOutcome` values:
  - `CONNECTED`
  - `NO_ANSWER`
  - `CALLBACK_REQUESTED`
  - `RESOLVED`
- Response: created follow-up log

### GET /api/executive/follow-ups
- Query params (optional):
  - `page`: number
  - `limit`: number
  - other filters passed in `req.query`
- Response: follow-up logs for the executive

### GET /api/executive/follow-ups/pending
- Query params (optional):
  - `page`: number
  - `limit`: number
- Response: pending follow-up calls

### PATCH /api/executive/follow-ups/:id
- Request body (any of these optional fields):
  ```json
  {
    "callOutcome": "RESOLVED",
    "notes": "Issue resolved",
    "followUpDate": "2026-07-21T15:00:00.000Z"
  }
  ```
- Response: updated follow-up log

---

## 3. Escalations

### POST /api/executive/escalations
- Request body:
  ```json
  {
    "bookingId": "<bookingObjectId>",
    "ticketId": "<ticketObjectId>",
    "raisedBy": "CUSTOMER",
    "relatedUserId": "<relatedUserObjectId>",
    "severity": "HIGH",
    "description": "Customer reported repeated delay"
  }
  ```
- Supported `raisedBy` values:
  - `CUSTOMER`
  - `PARTNER`
  - `SYSTEM`
- Supported `severity` values:
  - `LOW`
  - `MEDIUM`
  - `HIGH`
  - `CRITICAL`
- Response: created escalation

### GET /api/executive/escalations
- Query params (optional):
  - `page`: number
  - `limit`: number
  - other filters passed in `req.query`
- Response: list of escalations

### GET /api/executive/escalations/:id
- Response: escalation details

### PATCH /api/executive/escalations/:id/assign-self
- Response: escalation assigned to the logged-in executive

### PATCH /api/executive/escalations/:id/resolve
- Request body:
  ```json
  {
    "resolutionNotes": "Escalation resolved after follow-up"
  }
  ```
- Response: resolved escalation

---

## 4. Status Overview

### GET /api/executive/customer-status
- Query params (optional):
  - `page`: number
  - `limit`: number
- Response: customer status overview

### GET /api/executive/partner-status
- Query params (optional):
  - `page`: number
  - `limit`: number
- Response: partner status overview

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

# Frontend sidebar / nav suggestions for EXECUTIVE

- Dashboard / Home
- Leads
- Follow-up Calls
- Pending Follow-ups
- Escalations
- Customer Status
- Partner Status
- Profile / Account
