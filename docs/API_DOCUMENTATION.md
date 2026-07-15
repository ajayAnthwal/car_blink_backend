# CarBlink Backend — API Documentation
> **Base URL:** `http://localhost:8000/api` (local development). Production URL to be added later.  
> **Last Updated:** July 15, 2026  
> **Total Endpoints Documented:** 58

---

## Table of Contents

- [Authentication Guide](#authentication-guide)
- [Standard Response Format](#standard-response-format)
- [Common Error Codes Reference](#common-error-codes-reference)
- [Enums Reference](#enums-reference)
- [Pagination Format](#pagination-format)
- [File Upload Guide](#file-upload-guide)
- [Auth](#auth)
- [User](#user)
- [Upload](#upload)
- [Master Data](#master-data)
- [Customer — Garage](#customer--garage)
- [Customer — Booking](#customer--booking)
- [Customer — Warranty](#customer--warranty)
- [Customer — Support Ticket](#customer--support-ticket)
- [Partner — Profile](#partner--profile)
- [Partner — KYC](#partner--kyc)
- [Partner — Bidding](#partner--bidding)
- [Partner — Jobs](#partner--jobs)
- [Partner — Earnings](#partner--earnings)

---

## Authentication Guide

CarBlink uses JWT-based authentication with access tokens and refresh tokens.

### 1. Registration
**Endpoint:** `POST /api/auth/register`  
Send `fullName`, `email`, `phone`, `password`, and `role` (`CUSTOMER` or `PARTNER`).  
The server creates the user and generates an OTP (logged to console in development).  
**Important:** Registration does NOT return tokens. You must verify OTP first.

### 2. OTP Verification
**Endpoint:** `POST /api/auth/verify-otp`  
Send the same `identifier` (email or phone) used during registration and the `otp` received.  
**Success response** returns `accessToken` and `refreshToken` along with the user profile.

### 3. Login
**Endpoint:** `POST /api/auth/login`  
Send `identifier` (email or phone) and `password`.  
**Success response** returns `accessToken` and `refreshToken`.

### 4. Using Tokens
Attach the access token to every authenticated request in the `Authorization` header:
```
Authorization: Bearer <accessToken>
```

### 5. Token Expiry
- **Access Token:** 15 minutes
- **Refresh Token:** 7 days

### 6. Refreshing Tokens
**Endpoint:** `POST /api/auth/refresh-token`  
Send the `refreshToken` in the body to get a new `accessToken`.  
Use this when the access token expires without forcing the user to log in again.

### 7. Logout
**Endpoint:** `POST /api/auth/logout`  
Send the request with the `Authorization` header. Returns success. (Token blacklist is TODO — currently stateless.)

### 8. Forgot / Reset Password
- `POST /api/auth/forgot-password` — Send `identifier`. Server sends a reset OTP.
- `POST /api/auth/reset-password` — Send `identifier`, `token` (the OTP), and `newPassword`.

---

## Standard Response Format

Every endpoint in this API returns responses in one of two standard shapes.

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "...": "..."
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Human-readable error description",
  "errorCode": "VALIDATION_ERROR"
}
```

---

## Common Error Codes Reference

| `errorCode` Value | Plain-English Meaning |
|---|---|
| `VALIDATION_ERROR` | Request data failed validation (missing fields, wrong format, invalid enum value, invalid state transition) |
| `UNAUTHORIZED` | No token provided, token is invalid/expired, or credentials are wrong |
| `NOT_FOUND` | Requested resource (user, booking, vehicle, etc.) does not exist |
| `FORBIDDEN` | Authenticated user does not have the required role for this action |
| `CONFLICT` | Resource already exists (duplicate email, phone, or bid) |
| `INTERNAL_ERROR` | Unexpected server error |

---

## Enums Reference

### User Roles
| Value | Description |
|---|---|
| `CUSTOMER` | End-user booking services |
| `PARTNER` | Garage/service provider accepting jobs |
| `EXECUTIVE` | Internal field executive (not used in documented endpoints) |
| `ACCOUNTS` | Internal accounts team (not used in documented endpoints) |
| `SUPER_ADMIN` | Platform administrator |

### Booking Status
| Value | Description |
|---|---|
| `PENDING` | New booking waiting for partner quotes |
| `QUOTED` | At least one partner has placed a bid |
| `ACCEPTED` | Customer selected a quote |
| `IN_PROGRESS` | Partner has started the job |
| `COMPLETED` | Job finished |
| `CANCELLED` | Booking cancelled by customer |

### Job Status
| Value | Description |
|---|---|
| `NOT_STARTED` | Job created but partner hasn't started |
| `IN_PROGRESS` | Work is ongoing |
| `COMPLETED` | Work finished |

### Bid Status
| Value | Description |
|---|---|
| `PENDING` | Bid placed, awaiting customer decision |
| `ACCEPTED` | Customer selected this bid |
| `REJECTED` | Customer chose a different bid |
| `WITHDRAWN` | Partner removed their bid |

### Support Ticket Status
| Value | Description |
|---|---|
| `OPEN` | New ticket awaiting response |
| `IN_PROGRESS` | Support team is working on it |
| `RESOLVED` | Issue resolved |
| `CLOSED` | Ticket closed |

### Support Ticket Priority
| Value | Description |
|---|---|
| `LOW` | Low urgency |
| `MEDIUM` | Normal priority (default) |
| `HIGH` | High urgency |

### Warranty Status
| Value | Description |
|---|---|
| `ACTIVE` | Warranty is currently valid |
| `EXPIRED` | Warranty period has ended |
| `CLAIMED` | Warranty was used |

### Partner Verification Status
| Value | Description |
|---|---|
| `PENDING` | Profile submitted, awaiting review |
| `UNDER_REVIEW` | Admin is reviewing documents |
| `APPROVED` | Partner verified |
| `REJECTED` | Verification rejected |

### KYC Document Types
| Value | Description |
|---|---|
| `GST_CERTIFICATE` | GST registration certificate |
| `SHOP_LICENSE` | Business shop license |
| `ID_PROOF` | Owner ID proof (Aadhaar, PAN, etc.) |
| `ADDRESS_PROOF` | Business address proof |

### Fuel Type
| Value | Description |
|---|---|
| `PETROL` | Petrol engine |
| `DIESEL` | Diesel engine |
| `ELECTRIC` | Electric vehicle |
| `CNG` | Compressed Natural Gas |
| `HYBRID` | Hybrid engine |

---

## Pagination Format

Most list endpoints use the standard pagination shape:

```json
{
  "data": [
    { "...": "..." }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "pages": 5
  }
}
```

**Query Parameters:**
- `page` (number, optional, default: `1`) — Page number
- `limit` (number, optional, default: `10`, max: `100`) — Items per page

**Note:** Some endpoints (`bookings`, `warranties`, `support-tickets`, `leads`, `bids`, `jobs`) use a **custom pagination format** that wraps results differently. These are documented individually below.

---

## File Upload Guide

**Endpoint:** `POST /api/upload`  
**Auth Required:** Yes (Bearer token)  
**Content-Type:** `multipart/form-data`

### Form Fields
| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | Yes | The image or document to upload. Accepted types: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`. Max size: **5 MB**. |
| `folder` | String | No | Target folder inside Cloudinary. Default: `general`. Other common values: `profile-images`, `documents`, `invoices`, `warranty-docs`. |

### Success Response
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "fileUrl": "https://res.cloudinary.com/carblink/image/upload/v1700000000/carblink/general/myfile.jpg"
  }
}
```

### Usage Pattern
1. Call `POST /api/upload` with the file.
2. Copy the `fileUrl` from the response.
3. Submit that URL in the relevant endpoint body (e.g., `profileImage`, `documentUrl`, `invoiceUrl`, `warrantyDocumentUrl`, or `photos` array).

---

## Auth

---
### POST /api/auth/register
**Description:** Register a new user as CUSTOMER or PARTNER and generate an OTP for phone verification.  
**Auth Required:** No  
**Role Restriction:** None (but role must be `CUSTOMER` or `PARTNER`)

**Request Body:**
```json
{
  "fullName": "Rahul Sharma",
  "email": "rahul@example.com",
  "phone": "+919876543210",
  "password": "Rahul@123",
  "role": "CUSTOMER"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "fullName": "Rahul Sharma",
      "email": "rahul@example.com",
      "phone": "+919876543210",
      "role": "CUSTOMER",
      "isPhoneVerified": false,
      "isEmailVerified": false,
      "isActive": true,
      "profileImage": null,
      "lastLoginAt": null,
      "createdAt": "2024-06-15T10:30:00.000Z",
      "updatedAt": "2024-06-15T10:30:00.000Z"
    }
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 400 | Validation failed (missing fields, invalid email/phone/password format) | `{ "success": false, "message": "Email is already registered", "errorCode": "CONFLICT" }` |
| 409 | Email or phone already exists | `{ "success": false, "message": "Phone number is already registered", "errorCode": "CONFLICT" }` |
| 401 | Role is not CUSTOMER or PARTNER | `{ "success": false, "message": "Unauthorized role registration", "errorCode": "UNAUTHORIZED" }` |

---
### POST /api/auth/verify-otp
**Description:** Verify the OTP sent during registration and receive access + refresh tokens.  
**Auth Required:** No  
**Role Restriction:** None

**Request Body:**
```json
{
  "identifier": "+919876543210",
  "otp": "123456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "fullName": "Rahul Sharma",
      "email": "rahul@example.com",
      "phone": "+919876543210",
      "role": "CUSTOMER",
      "isPhoneVerified": true,
      "isEmailVerified": false,
      "isActive": true,
      "profileImage": null,
      "lastLoginAt": null,
      "createdAt": "2024-06-15T10:30:00.000Z",
      "updatedAt": "2024-06-15T10:30:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 400 | OTP is not exactly 6 digits | `{ "success": false, "message": "OTP must be exactly 6 digits", "errorCode": "VALIDATION_ERROR" }` |
| 401 | OTP is invalid or expired | `{ "success": false, "message": "Invalid or expired OTP", "errorCode": "UNAUTHORIZED" }` |
| 404 | User not found | `{ "success": false, "message": "User not found", "errorCode": "NOT_FOUND" }` |

---
### POST /api/auth/login
**Description:** Authenticate with email/phone and password to get access and refresh tokens.  
**Auth Required:** No  
**Role Restriction:** None (rate limited)

**Request Body:**
```json
{
  "identifier": "rahul@example.com",
  "password": "Rahul@123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "fullName": "Rahul Sharma",
      "email": "rahul@example.com",
      "phone": "+919876543210",
      "role": "CUSTOMER",
      "isPhoneVerified": true,
      "isEmailVerified": true,
      "isActive": true,
      "profileImage": null,
      "lastLoginAt": "2024-06-20T14:00:00.000Z",
      "createdAt": "2024-06-15T10:30:00.000Z",
      "updatedAt": "2024-06-20T14:00:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 400 | Validation failed (empty identifier/password) | `{ "success": false, "message": "Email or phone number is required", "errorCode": "VALIDATION_ERROR" }` |
| 401 | Invalid credentials or account suspended | `{ "success": false, "message": "Invalid credentials", "errorCode": "UNAUTHORIZED" }` |

---
### POST /api/auth/refresh-token
**Description:** Exchange a valid refresh token for a new access token.  
**Auth Required:** No  
**Role Restriction:** None

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 400 | Refresh token missing/empty | `{ "success": false, "message": "Refresh token is required", "errorCode": "VALIDATION_ERROR" }` |
| 401 | Token invalid, expired, or user inactive | `{ "success": false, "message": "Invalid session or user is inactive", "errorCode": "UNAUTHORIZED" }` |

---
### POST /api/auth/logout
**Description:** Logout the current user. Returns success. (Token blacklist pending TODO.)  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** Any authenticated role

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logout successful",
  "data": {
    "success": true
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 404 | User not found | `{ "success": false, "message": "User not found", "errorCode": "NOT_FOUND" }` |

---

## User

---
### GET /api/users/profile
**Description:** Get the current user's profile.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** Any authenticated role

**Request Params (URL):** None

**Success Response (200):**
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "fullName": "Rahul Sharma",
    "email": "rahul@example.com",
    "phone": "+919876543210",
    "role": "CUSTOMER",
    "isPhoneVerified": true,
    "isEmailVerified": true,
    "isActive": true,
    "profileImage": null,
    "lastLoginAt": "2024-06-20T14:00:00.000Z",
    "createdAt": "2024-06-15T10:30:00.000Z",
    "updatedAt": "2024-06-20T14:00:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 404 | User not found or inactive | `{ "success": false, "message": "User not found", "errorCode": "NOT_FOUND" }` |

---
### PATCH /api/users/profile
**Description:** Update the current user's profile (fullName and/or profileImage URL).  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** Any authenticated role

**Request Body:**
```json
{
  "fullName": "Rahul S.",
  "profileImage": "https://res.cloudinary.com/carblink/image/upload/v1700000000/carblink/profile-images/rahul.jpg"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "User profile updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "fullName": "Rahul S.",
    "email": "rahul@example.com",
    "phone": "+919876543210",
    "role": "CUSTOMER",
    "isPhoneVerified": true,
    "isEmailVerified": true,
    "isActive": true,
    "profileImage": "https://res.cloudinary.com/carblink/image/upload/v1700000000/carblink/profile-images/rahul.jpg",
    "lastLoginAt": "2024-06-20T14:00:00.000Z",
    "createdAt": "2024-06-15T10:30:00.000Z",
    "updatedAt": "2024-06-21T09:00:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 400 | Validation failed (empty fullName) | `{ "success": false, "message": "Full name cannot be empty", "errorCode": "VALIDATION_ERROR" }` |
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 404 | User not found or inactive | `{ "success": false, "message": "User not found", "errorCode": "NOT_FOUND" }` |

---
### PATCH /api/users/change-password
**Description:** Change the current user's password by providing the current password and a new password.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** Any authenticated role

**Request Body:**
```json
{
  "currentPassword": "OldPass@123",
  "newPassword": "NewPass@456",
  "confirmNewPassword": "NewPass@456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": {
    "message": "Password changed successfully"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 400 | New password does not match confirmNewPassword | `{ "success": false, "message": "New passwords do not match", "errorCode": "VALIDATION_ERROR" }` |
| 401 | Current password is wrong | `{ "success": false, "message": "Current password is incorrect", "errorCode": "UNAUTHORIZED" }` |
| 404 | User not found | `{ "success": false, "message": "User not found", "errorCode": "NOT_FOUND" }` |

---
### PATCH /api/users/deactivate
**Description:** Deactivate the current user's own account. This is irreversible.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** Any authenticated role

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "message": "Account deactivated successfully",
  "data": {
    "success": true
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 404 | User not found | `{ "success": false, "message": "User not found", "errorCode": "NOT_FOUND" }` |

---

## Upload

---
### POST /api/upload
**Description:** Upload a single file (image) to Cloudinary and get back a secure URL.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** Any authenticated role  
**Content-Type:** `multipart/form-data`

**Request Form Fields:**
| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | Yes | Image file. Accepted MIME types: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`. Max size: **5 MB**. |
| `folder` | String | No | Cloudinary sub-folder. Default: `general`. |

**Success Response (200):**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "fileUrl": "https://res.cloudinary.com/carblink/image/upload/v1700000000/carblink/profile-images/rahul.jpg"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 400 | No file uploaded | `{ "success": false, "message": "No file uploaded", "errorCode": "VALIDATION_ERROR" }` |
| 400 | File type not allowed | `{ "success": false, "message": "Only the following file formats are allowed: image/jpeg, image/jpg, image/png, image/webp", "errorCode": "VALIDATION_ERROR" }` |
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |

---

## Master Data

---
### GET /api/services
**Description:** Get a paginated list of active service categories.  
**Auth Required:** No  
**Role Restriction:** Public

**Request Query Params:**
| Name | Type | Required | Description | Default |
|---|---|---|---|---|
| `page` | number | No | Page number | `1` |
| `limit` | number | No | Items per page (max 100) | `10` |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Services retrieved successfully",
  "data": {
    "data": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Periodic Service",
        "icon": "car-service",
        "category": "Maintenance",
        "isActive": true,
        "createdAt": "2024-06-15T10:00:00.000Z",
        "updatedAt": "2024-06-15T10:00:00.000Z"
      },
      {
        "_id": "507f1f77bcf86cd799439013",
        "name": "AC Repair",
        "icon": "ac",
        "category": "Repair",
        "isActive": true,
        "createdAt": "2024-06-15T10:05:00.000Z",
        "updatedAt": "2024-06-15T10:05:00.000Z"
      }
    ],
    "pagination": {
      "total": 15,
      "page": 1,
      "limit": 10,
      "pages": 2
    }
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 400 | Invalid page/limit values | `{ "success": false, "message": "...", "errorCode": "VALIDATION_ERROR" }` |

---
### GET /api/cities
**Description:** Get a paginated list of active cities.  
**Auth Required:** No  
**Role Restriction:** Public

**Request Query Params:**
| Name | Type | Required | Description | Default |
|---|---|---|---|---|
| `page` | number | No | Page number | `1` |
| `limit` | number | No | Items per page (max 100) | `10` |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Cities retrieved successfully",
  "data": {
    "data": [
      {
        "_id": "507f1f77bcf86cd799439014",
        "name": "Mumbai",
        "state": "Maharashtra",
        "isActive": true,
        "createdAt": "2024-06-15T10:00:00.000Z",
        "updatedAt": "2024-06-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 27,
      "page": 1,
      "limit": 10,
      "pages": 3
    }
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 400 | Invalid page/limit values | `{ "success": false, "message": "...", "errorCode": "VALIDATION_ERROR" }` |

---
### GET /api/vehicle-brands
**Description:** Get a list of all active vehicle brands.  
**Auth Required:** No  
**Role Restriction:** Public

**Request Query Params:** None

**Success Response (200):**
```json
{
  "success": true,
  "message": "Vehicle brands retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439015",
      "name": "Maruti Suzuki",
      "logo": "https://res.cloudinary.com/carblink/image/upload/v1700000000/carblink/logos/maruti.png",
      "isActive": true,
      "createdAt": "2024-06-15T10:00:00.000Z",
      "updatedAt": "2024-06-15T10:00:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439016",
      "name": "Honda",
      "logo": null,
      "isActive": true,
      "createdAt": "2024-06-15T10:05:00.000Z",
      "updatedAt": "2024-06-15T10:05:00.000Z"
    }
  ]
}
```

**Error Responses:** None expected (public read).

---
### GET /api/vehicle-models
**Description:** Get all active vehicle models for a specific brand.  
**Auth Required:** No  
**Role Restriction:** Public

**Request Query Params:**
| Name | Type | Required | Description |
|---|---|---|---|
| `brandId` | string | Yes | MongoDB ObjectId of the vehicle brand |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Vehicle models retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439017",
      "brandId": {
        "_id": "507f1f77bcf86cd799439016",
        "name": "Honda",
        "logo": null,
        "isActive": true,
        "createdAt": "2024-06-15T10:05:00.000Z",
        "updatedAt": "2024-06-15T10:05:00.000Z"
      },
      "name": "Honda City",
      "isActive": true,
      "createdAt": "2024-06-15T10:10:00.000Z",
      "updatedAt": "2024-06-15T10:10:00.000Z"
    }
  ]
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 404 | Brand not found or inactive | `{ "success": false, "message": "Vehicle brand not found", "errorCode": "NOT_FOUND" }` |

---
### POST /api/services
**Description:** Create a new service category.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** SUPER_ADMIN only

**Request Body:**
```json
{
  "name": "Oil Change",
  "icon": "oil",
  "category": "Maintenance"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Service created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439018",
    "name": "Oil Change",
    "icon": "oil",
    "category": "Maintenance",
    "isActive": true,
    "createdAt": "2024-06-15T10:00:00.000Z",
    "updatedAt": "2024-06-15T10:00:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 400 | Validation failed (missing name/icon) | `{ "success": false, "message": "Service name is required", "errorCode": "VALIDATION_ERROR" }` |
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not SUPER_ADMIN | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 409 | Duplicate service name | `{ "success": false, "message": "...", "errorCode": "CONFLICT" }` |

---
### PATCH /api/services/:id
**Description:** Update an existing service category.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** SUPER_ADMIN only

**Request Params (URL):**
| Name | Description |
|---|---|
| `id` | MongoDB ObjectId of the service |

**Request Body:**
```json
{
  "name": "Periodic Service",
  "icon": "car-service",
  "category": "Maintenance"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Service updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Periodic Service",
    "icon": "car-service",
    "category": "Maintenance",
    "isActive": true,
    "createdAt": "2024-06-15T10:00:00.000Z",
    "updatedAt": "2024-06-21T09:00:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 400 | Validation failed | `{ "success": false, "message": "...", "errorCode": "VALIDATION_ERROR" }` |
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not SUPER_ADMIN | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | Service not found or inactive | `{ "success": false, "message": "Service category not found", "errorCode": "NOT_FOUND" }` |

---
### DELETE /api/services/:id
**Description:** Soft-delete a service category (sets `isActive` to false).  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** SUPER_ADMIN only

**Request Params (URL):**
| Name | Description |
|---|---|
| `id` | MongoDB ObjectId of the service |

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "message": "Service deleted successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Periodic Service",
    "icon": "car-service",
    "category": "Maintenance",
    "isActive": false,
    "createdAt": "2024-06-15T10:00:00.000Z",
    "updatedAt": "2024-06-21T09:00:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not SUPER_ADMIN | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | Service not found or already inactive | `{ "success": false, "message": "Service category not found", "errorCode": "NOT_FOUND" }` |

---
### POST /api/cities
**Description:** Create a new city.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** SUPER_ADMIN only

**Request Body:**
```json
{
  "name": "Pune",
  "state": "Maharashtra"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "City created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439019",
    "name": "Pune",
    "state": "Maharashtra",
    "isActive": true,
    "createdAt": "2024-06-15T10:00:00.000Z",
    "updatedAt": "2024-06-15T10:00:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 400 | Validation failed (missing name/state) | `{ "success": false, "message": "City name is required", "errorCode": "VALIDATION_ERROR" }` |
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not SUPER_ADMIN | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 409 | Duplicate city name | `{ "success": false, "message": "...", "errorCode": "CONFLICT" }` |

---
### PATCH /api/cities/:id
**Description:** Update an existing city.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** SUPER_ADMIN only

**Request Params (URL):**
| Name | Description |
|---|---|
| `id` | MongoDB ObjectId of the city |

**Request Body:**
```json
{
  "name": "Pune",
  "state": "Maharashtra"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "City updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439019",
    "name": "Pune",
    "state": "Maharashtra",
    "isActive": true,
    "createdAt": "2024-06-15T10:00:00.000Z",
    "updatedAt": "2024-06-21T09:00:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 400 | Validation failed | `{ "success": false, "message": "...", "errorCode": "VALIDATION_ERROR" }` |
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not SUPER_ADMIN | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | City not found or inactive | `{ "success": false, "message": "City not found", "errorCode": "NOT_FOUND" }` |

---
### DELETE /api/cities/:id
**Description:** Soft-delete a city (sets `isActive` to false).  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** SUPER_ADMIN only

**Request Params (URL):**
| Name | Description |
|---|---|
| `id` | MongoDB ObjectId of the city |

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "message": "City deleted successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439019",
    "name": "Pune",
    "state": "Maharashtra",
    "isActive": false,
    "createdAt": "2024-06-15T10:00:00.000Z",
    "updatedAt": "2024-06-21T09:00:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not SUPER_ADMIN | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | City not found or already inactive | `{ "success": false, "message": "City not found", "errorCode": "NOT_FOUND" }` |

---
### POST /api/vehicle-brands
**Description:** Create a new vehicle brand.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** SUPER_ADMIN only

**Request Body:**
```json
{
  "name": "Honda",
  "logo": "https://res.cloudinary.com/carblink/image/upload/v1700000000/carblink/logos/honda.png"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Vehicle brand created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439016",
    "name": "Honda",
    "logo": "https://res.cloudinary.com/carblink/image/upload/v1700000000/carblink/logos/honda.png",
    "isActive": true,
    "createdAt": "2024-06-15T10:05:00.000Z",
    "updatedAt": "2024-06-15T10:05:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 400 | Validation failed (missing name) | `{ "success": false, "message": "Brand name is required", "errorCode": "VALIDATION_ERROR" }` |
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not SUPER_ADMIN | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 409 | Duplicate brand name | `{ "success": false, "message": "...", "errorCode": "CONFLICT" }` |

---
### POST /api/vehicle-models
**Description:** Create a new vehicle model under an existing brand.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** SUPER_ADMIN only

**Request Body:**
```json
{
  "brandId": "507f1f77bcf86cd799439016",
  "name": "Honda City"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Vehicle model created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439017",
    "brandId": {
      "_id": "507f1f77bcf86cd799439016",
      "name": "Honda",
      "logo": "https://res.cloudinary.com/carblink/image/upload/v1700000000/carblink/logos/honda.png",
      "isActive": true,
      "createdAt": "2024-06-15T10:05:00.000Z",
      "updatedAt": "2024-06-15T10:05:00.000Z"
    },
    "name": "Honda City",
    "isActive": true,
    "createdAt": "2024-06-15T10:10:00.000Z",
    "updatedAt": "2024-06-15T10:10:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 404 | Brand not found or inactive | `{ "success": false, "message": "Vehicle brand not found", "errorCode": "NOT_FOUND" }` |

---

## Customer — Garage

---
### POST /api/customer/garage
**Description:** Add a new vehicle to the customer's garage.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** CUSTOMER only

**Request Body:**
```json
{
  "brand": "Honda",
  "model": "Honda City",
  "registrationNumber": "MH01AB1234",
  "fuelType": "PETROL",
  "year": 2022
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Vehicle added to garage successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439020",
    "customerId": "507f1f77bcf86cd799439011",
    "brand": "Honda",
    "model": "Honda City",
    "registrationNumber": "MH01AB1234",
    "fuelType": "PETROL",
    "year": 2022,
    "isActive": true,
    "createdAt": "2024-06-15T10:30:00.000Z",
    "updatedAt": "2024-06-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 400 | Validation failed (missing required fields or invalid fuelType) | `{ "success": false, "message": "Brand is required", "errorCode": "VALIDATION_ERROR" }` |
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not CUSTOMER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |

---
### GET /api/customer/garage
**Description:** Get all active vehicles in the customer's garage.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** CUSTOMER only

**Request Query Params:** None

**Success Response (200):**
```json
{
  "success": true,
  "message": "Garage vehicles retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "customerId": "507f1f77bcf86cd799439011",
      "brand": "Honda",
      "model": "Honda City",
      "registrationNumber": "MH01AB1234",
      "fuelType": "PETROL",
      "year": 2022,
      "isActive": true,
      "createdAt": "2024-06-15T10:30:00.000Z",
      "updatedAt": "2024-06-15T10:30:00.000Z"
    }
  ]
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not CUSTOMER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |

---
### PATCH /api/customer/garage/:id
**Description:** Update a vehicle in the customer's garage.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** CUSTOMER only

**Request Params (URL):**
| Name | Description |
|---|---|
| `id` | MongoDB ObjectId of the garage vehicle |

**Request Body:**
```json
{
  "brand": "Honda",
  "model": "Honda City",
  "registrationNumber": "MH01AB1234",
  "fuelType": "PETROL",
  "year": 2023
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Vehicle updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439020",
    "customerId": "507f1f77bcf86cd799439011",
    "brand": "Honda",
    "model": "Honda City",
    "registrationNumber": "MH01AB1234",
    "fuelType": "PETROL",
    "year": 2023,
    "isActive": true,
    "createdAt": "2024-06-15T10:30:00.000Z",
    "updatedAt": "2024-06-21T09:00:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 400 | Validation failed | `{ "success": false, "message": "...", "errorCode": "VALIDATION_ERROR" }` |
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not CUSTOMER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | Vehicle not found | `{ "success": false, "message": "Vehicle not found", "errorCode": "NOT_FOUND" }` |

---
### DELETE /api/customer/garage/:id
**Description:** Soft-delete a vehicle from the customer's garage (sets `isActive` to false).  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** CUSTOMER only

**Request Params (URL):**
| Name | Description |
|---|---|
| `id` | MongoDB ObjectId of the garage vehicle |

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "message": "Vehicle removed from garage successfully",
  "data": {
    "success": true
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not CUSTOMER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | Vehicle not found | `{ "success": false, "message": "Vehicle not found", "errorCode": "NOT_FOUND" }` |

---

## Customer — Booking

---
### POST /api/customer/bookings
**Description:** Create a new booking lead for a vehicle and service in a specific city.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** CUSTOMER only

**Request Body:**
```json
{
  "vehicleId": "507f1f77bcf86cd799439020",
  "serviceId": "507f1f77bcf86cd799439012",
  "cityId": "507f1f77bcf86cd799439014",
  "description": "Brake pads making noise, need inspection",
  "preferredDate": "2024-07-20"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439021",
    "customerId": "507f1f77bcf86cd799439011",
    "vehicleId": "507f1f77bcf86cd799439020",
    "serviceId": "507f1f77bcf86cd799439012",
    "cityId": "507f1f77bcf86cd799439014",
    "description": "Brake pads making noise, need inspection",
    "preferredDate": "2024-07-20T00:00:00.000Z",
    "status": "PENDING",
    "acceptedBidId": null,
    "assignedExecutiveId": null,
    "beforePhotos": [],
    "afterPhotos": [],
    "cancellationReason": null,
    "createdAt": "2024-06-15T10:30:00.000Z",
    "updatedAt": "2024-06-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 400 | Validation failed or vehicle not in garage | `{ "success": false, "message": "Vehicle not found in garage", "errorCode": "NOT_FOUND" }` |
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not CUSTOMER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | Service or city not found/inactive | `{ "success": false, "message": "Service category not found or inactive", "errorCode": "NOT_FOUND" }` |

---
### GET /api/customer/bookings
**Description:** Get the customer's bookings with optional status filter and pagination.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** CUSTOMER only

**Request Query Params:**
| Name | Type | Required | Description | Default |
|---|---|---|---|---|
| `status` | string | No | Filter by booking status (PENDING, QUOTED, ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED) | None |
| `page` | number | No | Page number | `1` |
| `limit` | number | No | Items per page | `10` |

**Success Response (200):**
```json
{
  "success": true,
  "message": "My bookings retrieved successfully",
  "data": {
    "bookings": [
      {
        "_id": "507f1f77bcf86cd799439021",
        "customerId": "507f1f77bcf86cd799439011",
        "vehicleId": {
          "_id": "507f1f77bcf86cd799439020",
          "brand": "Honda",
          "model": "Honda City",
          "registrationNumber": "MH01AB1234",
          "fuelType": "PETROL",
          "year": 2022,
          "isActive": true
        },
        "serviceId": {
          "_id": "507f1f77bcf86cd799439012",
          "name": "Periodic Service",
          "icon": "car-service",
          "category": "Maintenance",
          "isActive": true
        },
        "cityId": {
          "_id": "507f1f77bcf86cd799439014",
          "name": "Mumbai",
          "state": "Maharashtra",
          "isActive": true
        },
        "description": "Brake pads making noise, need inspection",
        "preferredDate": "2024-07-20T00:00:00.000Z",
        "status": "PENDING",
        "acceptedBidId": null,
        "assignedExecutiveId": null,
        "beforePhotos": [],
        "afterPhotos": [],
        "cancellationReason": null,
        "createdAt": "2024-06-15T10:30:00.000Z",
        "updatedAt": "2024-06-15T10:30:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not CUSTOMER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |

---
### GET /api/customer/bookings/:id
**Description:** Get a single booking by ID (must belong to the customer).  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** CUSTOMER only

**Request Params (URL):**
| Name | Description |
|---|---|
| `id` | MongoDB ObjectId of the booking |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Booking details retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439021",
    "customerId": "507f1f77bcf86cd799439011",
    "vehicleId": {
      "_id": "507f1f77bcf86cd799439020",
      "brand": "Honda",
      "model": "Honda City",
      "registrationNumber": "MH01AB1234",
      "fuelType": "PETROL",
      "year": 2022,
      "isActive": true
    },
    "serviceId": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Periodic Service",
      "icon": "car-service",
      "category": "Maintenance",
      "isActive": true
    },
    "cityId": {
      "_id": "507f1f77bcf86cd799439014",
      "name": "Mumbai",
      "state": "Maharashtra",
      "isActive": true
    },
    "description": "Brake pads making noise, need inspection",
    "preferredDate": "2024-07-20T00:00:00.000Z",
    "status": "PENDING",
    "acceptedBidId": null,
    "assignedExecutiveId": null,
    "beforePhotos": [],
    "afterPhotos": [],
    "cancellationReason": null,
    "createdAt": "2024-06-15T10:30:00.000Z",
    "updatedAt": "2024-06-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not CUSTOMER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | Booking not found | `{ "success": false, "message": "Booking not found", "errorCode": "NOT_FOUND" }` |

---
### PATCH /api/customer/bookings/:id/cancel
**Description:** Cancel a booking (only if status is PENDING or QUOTED).  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** CUSTOMER only

**Request Params (URL):**
| Name | Description |
|---|---|
| `id` | MongoDB ObjectId of the booking |

**Request Body:**
```json
{
  "reason": "Found a cheaper option elsewhere"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439021",
    "customerId": "507f1f77bcf86cd799439011",
    "vehicleId": {
      "_id": "507f1f77bcf86cd799439020",
      "brand": "Honda",
      "model": "Honda City",
      "registrationNumber": "MH01AB1234",
      "fuelType": "PETROL",
      "year": 2022,
      "isActive": true
    },
    "serviceId": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Periodic Service",
      "icon": "car-service",
      "category": "Maintenance",
      "isActive": true
    },
    "cityId": {
      "_id": "507f1f77bcf86cd799439014",
      "name": "Mumbai",
      "state": "Maharashtra",
      "isActive": true
    },
    "description": "Brake pads making noise, need inspection",
    "preferredDate": "2024-07-20T00:00:00.000Z",
    "status": "CANCELLED",
    "acceptedBidId": null,
    "assignedExecutiveId": null,
    "beforePhotos": [],
    "afterPhotos": [],
    "cancellationReason": "Found a cheaper option elsewhere",
    "createdAt": "2024-06-15T10:30:00.000Z",
    "updatedAt": "2024-06-16T08:00:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 400 | Booking is not in PENDING or QUOTED status | `{ "success": false, "message": "Cannot cancel booking in ACCEPTED status", "errorCode": "VALIDATION_ERROR" }` |
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not CUSTOMER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | Booking not found | `{ "success": false, "message": "Booking not found", "errorCode": "NOT_FOUND" }` |

---
### GET /api/customer/bookings/:id/quotes
**Description:** Get all non-withdrawn quotes/bids for a booking.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** CUSTOMER only

**Request Params (URL):**
| Name | Description |
|---|---|
| `id` | MongoDB ObjectId of the booking |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Booking quotes retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439022",
      "bookingId": "507f1f77bcf86cd799439021",
      "partnerId": {
        "_id": "507f1f77bcf86cd799439023",
        "businessName": "AutoFix Garage",
        "rating": 4.5
      },
      "quotedAmount": 3500,
      "estimatedDuration": "2 days",
      "notes": "We use genuine parts",
      "status": "PENDING",
      "createdAt": "2024-06-15T11:00:00.000Z",
      "updatedAt": "2024-06-15T11:00:00.000Z"
    }
  ]
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not CUSTOMER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | Booking not found | `{ "success": false, "message": "Booking not found", "errorCode": "NOT_FOUND" }` |

---
### POST /api/customer/bookings/:id/select-quote
**Description:** Accept a quote/bid for a booking, auto-creating a Job and marking other pending bids as rejected.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** CUSTOMER only

**Request Params (URL):**
| Name | Description |
|---|---|
| `id` | MongoDB ObjectId of the booking |

**Request Body:**
```json
{
  "bidId": "507f1f77bcf86cd799439022"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Quote selected successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439021",
    "customerId": "507f1f77bcf86cd799439011",
    "vehicleId": {
      "_id": "507f1f77bcf86cd799439020",
      "brand": "Honda",
      "model": "Honda City",
      "registrationNumber": "MH01AB1234",
      "fuelType": "PETROL",
      "year": 2022,
      "isActive": true
    },
    "serviceId": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Periodic Service",
      "icon": "car-service",
      "category": "Maintenance",
      "isActive": true
    },
    "cityId": {
      "_id": "507f1f77bcf86cd799439014",
      "name": "Mumbai",
      "state": "Maharashtra",
      "isActive": true
    },
    "description": "Brake pads making noise, need inspection",
    "preferredDate": "2024-07-20T00:00:00.000Z",
    "status": "ACCEPTED",
    "acceptedBidId": "507f1f77bcf86cd799439022",
    "assignedExecutiveId": null,
    "beforePhotos": [],
    "afterPhotos": [],
    "cancellationReason": null,
    "createdAt": "2024-06-15T10:30:00.000Z",
    "updatedAt": "2024-06-16T08:00:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 400 | Booking not in PENDING/QUOTED status or bid not PENDING | `{ "success": false, "message": "Cannot select quote for booking in CANCELLED status", "errorCode": "VALIDATION_ERROR" }` |
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not CUSTOMER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | Booking or bid not found | `{ "success": false, "message": "Booking not found", "errorCode": "NOT_FOUND" }` |

---

## Customer — Warranty

---
### GET /api/customer/warranties
**Description:** Get the customer's warranties with pagination.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** CUSTOMER only

**Request Query Params:**
| Name | Type | Required | Description | Default |
|---|---|---|---|---|
| `page` | number | No | Page number | `1` |
| `limit` | number | No | Items per page | `10` |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Warranties retrieved successfully",
  "data": {
    "warranties": [
      {
        "_id": "507f1f77bcf86cd799439024",
        "bookingId": {
          "_id": "507f1f77bcf86cd799439021",
          "status": "COMPLETED",
          "vehicleId": {
            "_id": "507f1f77bcf86cd799439020",
            "brand": "Honda",
            "model": "Honda City"
          },
          "serviceId": {
            "_id": "507f1f77bcf86cd799439012",
            "name": "Periodic Service"
          }
        },
        "customerId": "507f1f77bcf86cd799439011",
        "warrantyPeriodMonths": 6,
        "warrantyDocumentUrl": "https://res.cloudinary.com/carblink/image/upload/v1700000000/carblink/warranty-docs/warranty_123.pdf",
        "startDate": "2024-06-16T00:00:00.000Z",
        "expiryDate": "2024-12-16T00:00:00.000Z",
        "status": "ACTIVE",
        "createdAt": "2024-06-16T08:00:00.000Z",
        "updatedAt": "2024-06-16T08:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not CUSTOMER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |

---
### GET /api/customer/warranties/:id
**Description:** Get a single warranty by ID (must belong to the customer).  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** CUSTOMER only

**Request Params (URL):**
| Name | Description |
|---|---|
| `id` | MongoDB ObjectId of the warranty |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Warranty details retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439024",
    "bookingId": {
      "_id": "507f1f77bcf86cd799439021",
      "status": "COMPLETED",
      "vehicleId": {
        "_id": "507f1f77bcf86cd799439020",
        "brand": "Honda",
        "model": "Honda City"
      },
      "serviceId": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Periodic Service"
      }
    },
    "customerId": "507f1f77bcf86cd799439011",
    "warrantyPeriodMonths": 6,
    "warrantyDocumentUrl": "https://res.cloudinary.com/carblink/image/upload/v1700000000/carblink/warranty-docs/warranty_123.pdf",
    "startDate": "2024-06-16T00:00:00.000Z",
    "expiryDate": "2024-12-16T00:00:00.000Z",
    "status": "ACTIVE",
    "createdAt": "2024-06-16T08:00:00.000Z",
    "updatedAt": "2024-06-16T08:00:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not CUSTOMER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | Warranty not found | `{ "success": false, "message": "Warranty not found", "errorCode": "NOT_FOUND" }` |

---

## Customer — Support Ticket

---
### POST /api/customer/support-tickets
**Description:** Create a new support ticket, optionally linked to a booking.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** CUSTOMER only

**Request Body:**
```json
{
  "bookingId": "507f1f77bcf86cd799439021",
  "subject": "Service quality issue",
  "description": "The brake pads were not properly replaced",
  "priority": "HIGH"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Support ticket created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439025",
    "customerId": "507f1f77bcf86cd799439011",
    "bookingId": "507f1f77bcf86cd799439021",
    "subject": "Service quality issue",
    "description": "The brake pads were not properly replaced",
    "status": "OPEN",
    "priority": "HIGH",
    "messages": [],
    "createdAt": "2024-06-15T10:30:00.000Z",
    "updatedAt": "2024-06-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 400 | Validation failed (missing subject/description) | `{ "success": false, "message": "Subject is required", "errorCode": "VALIDATION_ERROR" }` |
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not CUSTOMER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | Booking not found (if bookingId provided) | `{ "success": false, "message": "Booking not found", "errorCode": "NOT_FOUND" }` |

---
### GET /api/customer/support-tickets
**Description:** Get the customer's support tickets with pagination.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** CUSTOMER only

**Request Query Params:**
| Name | Type | Required | Description | Default |
|---|---|---|---|---|
| `page` | number | No | Page number | `1` |
| `limit` | number | No | Items per page | `10` |

**Success Response (200):**
```json
{
  "success": true,
  "message": "My support tickets retrieved successfully",
  "data": {
    "tickets": [
      {
        "_id": "507f1f77bcf86cd799439025",
        "customerId": "507f1f77bcf86cd799439011",
        "bookingId": "507f1f77bcf86cd799439021",
        "subject": "Service quality issue",
        "description": "The brake pads were not properly replaced",
        "status": "OPEN",
        "priority": "HIGH",
        "messages": [],
        "createdAt": "2024-06-15T10:30:00.000Z",
        "updatedAt": "2024-06-15T10:30:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not CUSTOMER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |

---
### GET /api/customer/support-tickets/:id
**Description:** Get a single support ticket by ID (must belong to the customer).  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** CUSTOMER only

**Request Params (URL):**
| Name | Description |
|---|---|
| `id` | MongoDB ObjectId of the support ticket |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Support ticket details retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439025",
    "customerId": "507f1f77bcf86cd799439011",
    "bookingId": "507f1f77bcf86cd799439021",
    "subject": "Service quality issue",
    "description": "The brake pads were not properly replaced",
    "status": "OPEN",
    "priority": "HIGH",
    "messages": [
      {
        "senderId": "507f1f77bcf86cd799439026",
        "senderRole": "SUPER_ADMIN",
        "message": "We are looking into this issue",
        "createdAt": "2024-06-15T12:00:00.000Z"
      }
    ],
    "createdAt": "2024-06-15T10:30:00.000Z",
    "updatedAt": "2024-06-15T12:00:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not CUSTOMER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | Ticket not found | `{ "success": false, "message": "Support ticket not found", "errorCode": "NOT_FOUND" }` |

---
| 404 | Ticket not found | `{ "success": false, "message": "Support ticket not found", "errorCode": "NOT_FOUND" }` |

---

## Partner — Profile

---
### POST /api/partner/profile
**Description:** Create the partner's business profile.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** PARTNER only

**Request Body:**
```json
{
  "businessName": "AutoFix Garage",
  "businessAddress": "123 Main Street, Andheri West, Mumbai",
  "cityId": "507f1f77bcf86cd799439014",
  "servicesOffered": ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"],
  "gstNumber": "27AABCT1234R1ZX"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Partner profile completed successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439023",
    "userId": "507f1f77bcf86cd799439011",
    "businessName": "AutoFix Garage",
    "businessAddress": "123 Main Street, Andheri West, Mumbai",
    "cityId": {
      "_id": "507f1f77bcf86cd799439014",
      "name": "Mumbai",
      "state": "Maharashtra",
      "isActive": true
    },
    "servicesOffered": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Periodic Service",
        "icon": "car-service",
        "category": "Maintenance",
        "isActive": true
      },
      {
        "_id": "507f1f77bcf86cd799439013",
        "name": "AC Repair",
        "icon": "ac",
        "category": "Repair",
        "isActive": true
      }
    ],
    "gstNumber": "27AABCT1234R1ZX",
    "isVerified": false,
    "verificationStatus": "PENDING",
    "rejectionReason": null,
    "rating": 0,
    "totalReviews": 0,
    "createdAt": "2024-06-15T10:30:00.000Z",
    "updatedAt": "2024-06-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 400 | Validation failed (missing required fields) | `{ "success": false, "message": "Business name is required", "errorCode": "VALIDATION_ERROR" }` |
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not PARTNER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 409 | Partner profile already exists | `{ "success": false, "message": "Partner profile already exists", "errorCode": "CONFLICT" }` |

---
### GET /api/partner/profile
**Description:** Get the partner's business profile.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** PARTNER only

**Request Query Params:** None

**Success Response (200):**
```json
{
  "success": true,
  "message": "Partner profile retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439023",
    "userId": "507f1f77bcf86cd799439011",
    "businessName": "AutoFix Garage",
    "businessAddress": "123 Main Street, Andheri West, Mumbai",
    "cityId": {
      "_id": "507f1f77bcf86cd799439014",
      "name": "Mumbai",
      "state": "Maharashtra",
      "isActive": true
    },
    "servicesOffered": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Periodic Service",
        "icon": "car-service",
        "category": "Maintenance",
        "isActive": true
      }
    ],
    "gstNumber": "27AABCT1234R1ZX",
    "isVerified": false,
    "verificationStatus": "PENDING",
    "rejectionReason": null,
    "rating": 0,
    "totalReviews": 0,
    "createdAt": "2024-06-15T10:30:00.000Z",
    "updatedAt": "2024-06-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not PARTNER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | Partner profile not found | `{ "success": false, "message": "Partner profile not found", "errorCode": "NOT_FOUND" }` |

---
### PATCH /api/partner/profile
**Description:** Update the partner's business profile. Cannot update `userId`, `isVerified`, `verificationStatus`, `rating`, or `totalReviews` via this endpoint.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** PARTNER only

**Request Body:**
```json
{
  "businessName": "AutoFix Garage Pvt Ltd",
  "businessAddress": "456 Business Park, Powai, Mumbai",
  "cityId": "507f1f77bcf86cd799439014",
  "servicesOffered": ["507f1f77bcf86cd799439012"],
  "gstNumber": "27AABCT1234R1ZX"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Partner profile updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439023",
    "userId": "507f1f77bcf86cd799439011",
    "businessName": "AutoFix Garage Pvt Ltd",
    "businessAddress": "456 Business Park, Powai, Mumbai",
    "cityId": {
      "_id": "507f1f77bcf86cd799439014",
      "name": "Mumbai",
      "state": "Maharashtra",
      "isActive": true
    },
    "servicesOffered": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Periodic Service",
        "icon": "car-service",
        "category": "Maintenance",
        "isActive": true
      }
    ],
    "gstNumber": "27AABCT1234R1ZX",
    "isVerified": false,
    "verificationStatus": "PENDING",
    "rejectionReason": null,
    "rating": 0,
    "totalReviews": 0,
    "createdAt": "2024-06-15T10:30:00.000Z",
    "updatedAt": "2024-06-21T09:00:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 400 | Validation failed | `{ "success": false, "message": "...", "errorCode": "VALIDATION_ERROR" }` |
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not PARTNER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | Partner profile not found | `{ "success": false, "message": "Partner profile not found", "errorCode": "NOT_FOUND" }` |

---

## Partner — KYC

---
### POST /api/partner/kyc
**Description:** Upload a KYC document for the partner. Requires a partner profile to exist first.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** PARTNER only

**Request Body:**
```json
{
  "documentType": "GST_CERTIFICATE",
  "documentUrl": "https://res.cloudinary.com/carblink/image/upload/v1700000000/carblink/documents/gst_cert.pdf"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "KYC document uploaded successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439027",
    "partnerId": "507f1f77bcf86cd799439023",
    "documentType": "GST_CERTIFICATE",
    "documentUrl": "https://res.cloudinary.com/carblink/image/upload/v1700000000/carblink/documents/gst_cert.pdf",
    "status": "PENDING",
    "createdAt": "2024-06-15T10:30:00.000Z",
    "updatedAt": "2024-06-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 400 | Validation failed (missing documentType/documentUrl or invalid enum) | `{ "success": false, "message": "Document type is required", "errorCode": "VALIDATION_ERROR" }` |
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not PARTNER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | Partner profile not found | `{ "success": false, "message": "Partner profile not found. Please create a profile first.", "errorCode": "NOT_FOUND" }` |

---
### GET /api/partner/kyc
**Description:** Get all KYC documents for the partner.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** PARTNER only

**Request Query Params:** None

**Success Response (200):**
```json
{
  "success": true,
  "message": "KYC documents retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439027",
      "partnerId": "507f1f77bcf86cd799439023",
      "documentType": "GST_CERTIFICATE",
      "documentUrl": "https://res.cloudinary.com/carblink/image/upload/v1700000000/carblink/documents/gst_cert.pdf",
      "status": "PENDING",
      "createdAt": "2024-06-15T10:30:00.000Z",
      "updatedAt": "2024-06-15T10:30:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439028",
      "partnerId": "507f1f77bcf86cd799439023",
      "documentType": "SHOP_LICENSE",
      "documentUrl": "https://res.cloudinary.com/carblink/image/upload/v1700000000/carblink/documents/shop_license.pdf",
      "status": "APPROVED",
      "createdAt": "2024-06-15T10:35:00.000Z",
      "updatedAt": "2024-06-15T10:35:00.000Z"
    }
  ]
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not PARTNER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | Partner profile not found | `{ "success": false, "message": "Partner profile not found.", "errorCode": "NOT_FOUND" }` |

---

## Partner — Bidding

---
### GET /api/partner/leads
**Description:** Get available booking leads that match the partner's city and services, excluding bookings already bid on by this partner.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** PARTNER only

**Request Query Params:**
| Name | Type | Required | Description | Default |
|---|---|---|---|---|
| `page` | number | No | Page number | `1` |
| `limit` | number | No | Items per page | `10` |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Available booking leads retrieved successfully",
  "data": {
    "bookings": [
      {
        "_id": "507f1f77bcf86cd799439021",
        "customerId": "507f1f77bcf86cd799439011",
        "vehicleId": {
          "_id": "507f1f77bcf86cd799439020",
          "brand": "Honda",
          "model": "Honda City",
          "registrationNumber": "MH01AB1234",
          "fuelType": "PETROL",
          "year": 2022,
          "isActive": true
        },
        "serviceId": {
          "_id": "507f1f77bcf86cd799439012",
          "name": "Periodic Service",
          "icon": "car-service",
          "category": "Maintenance",
          "isActive": true
        },
        "cityId": {
          "_id": "507f1f77bcf86cd799439014",
          "name": "Mumbai",
          "state": "Maharashtra",
          "isActive": true
        },
        "description": "Brake pads making noise, need inspection",
        "preferredDate": "2024-07-20T00:00:00.000Z",
        "status": "PENDING",
        "acceptedBidId": null,
        "assignedExecutiveId": null,
        "beforePhotos": [],
        "afterPhotos": [],
        "cancellationReason": null,
        "createdAt": "2024-06-15T10:30:00.000Z",
        "updatedAt": "2024-06-15T10:30:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not PARTNER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | Partner profile not found | `{ "success": false, "message": "Partner profile not found", "errorCode": "NOT_FOUND" }` |

---
### POST /api/partner/bids
**Description:** Place a bid on a booking lead. If the booking was PENDING, its status changes to QUOTED.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** PARTNER only

**Request Body:**
```json
{
  "bookingId": "507f1f77bcf86cd799439021",
  "quotedAmount": 3500,
  "estimatedDuration": "2 days",
  "notes": "We use genuine parts and provide 6 months warranty"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Bid placed successfully on booking lead",
  "data": {
    "_id": "507f1f77bcf86cd799439022",
    "bookingId": "507f1f77bcf86cd799439021",
    "partnerId": "507f1f77bcf86cd799439023",
    "quotedAmount": 3500,
    "estimatedDuration": "2 days",
    "notes": "We use genuine parts and provide 6 months warranty",
    "status": "PENDING",
    "createdAt": "2024-06-15T11:00:00.000Z",
    "updatedAt": "2024-06-15T11:00:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 400 | Booking not in PENDING/QUOTED status | `{ "success": false, "message": "Cannot bid on booking in CANCELLED status", "errorCode": "VALIDATION_ERROR" }` |
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not PARTNER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | Booking or partner profile not found | `{ "success": false, "message": "Booking lead not found", "errorCode": "NOT_FOUND" }` |
| 409 | Already bid on this booking | `{ "success": false, "message": "You have already placed a bid on this booking", "errorCode": "CONFLICT" }` |

---
### GET /api/partner/bids
**Description:** Get the partner's bids with optional status filter and pagination.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** PARTNER only

**Request Query Params:**
| Name | Type | Required | Description | Default |
|---|---|---|---|---|
| `status` | string | No | Filter by bid status (PENDING, ACCEPTED, REJECTED, WITHDRAWN) | None |
| `page` | number | No | Page number | `1` |
| `limit` | number | No | Items per page | `10` |

**Success Response (200):**
```json
{
  "success": true,
  "message": "My bids retrieved successfully",
  "data": {
    "bids": [
      {
        "_id": "507f1f77bcf86cd799439022",
        "bookingId": {
          "_id": "507f1f77bcf86cd799439021",
          "status": "QUOTED",
          "vehicleId": {
            "_id": "507f1f77bcf86cd799439020",
            "brand": "Honda",
            "model": "Honda City"
          },
          "serviceId": {
            "_id": "507f1f77bcf86cd799439012",
            "name": "Periodic Service"
          },
          "cityId": {
            "_id": "507f1f77bcf86cd799439014",
            "name": "Mumbai"
          }
        },
        "partnerId": {
          "_id": "507f1f77bcf86cd799439023",
          "businessName": "AutoFix Garage",
          "rating": 4.5
        },
        "quotedAmount": 3500,
        "estimatedDuration": "2 days",
        "notes": "We use genuine parts and provide 6 months warranty",
        "status": "PENDING",
        "createdAt": "2024-06-15T11:00:00.000Z",
        "updatedAt": "2024-06-15T11:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not PARTNER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | Partner profile not found | `{ "success": false, "message": "Partner profile not found", "errorCode": "NOT_FOUND" }` |

---
### PATCH /api/partner/bids/:id/withdraw
**Description:** Withdraw a pending bid. Only works if bid status is PENDING.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** PARTNER only

**Request Params (URL):**
| Name | Description |
|---|---|
| `id` | MongoDB ObjectId of the bid |

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "message": "Bid withdrawn successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439022",
    "bookingId": "507f1f77bcf86cd799439021",
    "partnerId": "507f1f77bcf86cd799439023",
    "quotedAmount": 3500,
    "estimatedDuration": "2 days",
    "notes": "We use genuine parts and provide 6 months warranty",
    "status": "WITHDRAWN",
    "createdAt": "2024-06-15T11:00:00.000Z",
    "updatedAt": "2024-06-15T12:00:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 400 | Bid is not in PENDING status | `{ "success": false, "message": "Cannot withdraw bid in ACCEPTED status", "errorCode": "VALIDATION_ERROR" }` |
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not PARTNER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | Bid or partner profile not found | `{ "success": false, "message": "Bid not found", "errorCode": "NOT_FOUND" }` |

---

## Partner — Jobs

---
### GET /api/partner/jobs
**Description:** Get the partner's jobs with optional status filter and pagination.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** PARTNER only

**Request Query Params:**
| Name | Type | Required | Description | Default |
|---|---|---|---|---|
| `status` | string | No | Filter by job status (NOT_STARTED, IN_PROGRESS, COMPLETED) | None |
| `page` | number | No | Page number | `1` |
| `limit` | number | No | Items per page | `10` |

**Success Response (200):**
```json
{
  "success": true,
  "message": "My jobs retrieved successfully",
  "data": {
    "jobs": [
      {
        "_id": "507f1f77bcf86cd799439029",
        "bookingId": {
          "_id": "507f1f77bcf86cd799439021",
          "status": "ACCEPTED",
          "vehicleId": {
            "_id": "507f1f77bcf86cd799439020",
            "brand": "Honda",
            "model": "Honda City"
          },
          "serviceId": {
            "_id": "507f1f77bcf86cd799439012",
            "name": "Periodic Service"
          },
          "cityId": {
            "_id": "507f1f77bcf86cd799439014",
            "name": "Mumbai"
          }
        },
        "partnerId": "507f1f77bcf86cd799439023",
        "bidId": "507f1f77bcf86cd799439022",
        "status": "NOT_STARTED",
        "startedAt": null,
        "completedAt": null,
        "invoiceUrl": null,
        "beforePhotos": [],
        "afterPhotos": [],
        "finalAmount": null,
        "createdAt": "2024-06-16T08:00:00.000Z",
        "updatedAt": "2024-06-16T08:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not PARTNER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | Partner profile not found | `{ "success": false, "message": "Partner profile not found", "errorCode": "NOT_FOUND" }` |

---
### PATCH /api/partner/jobs/:id/start
**Description:** Start a job (must be in NOT_STARTED status). Updates job status to IN_PROGRESS and syncs booking status.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** PARTNER only

**Request Params (URL):**
| Name | Description |
|---|---|
| `id` | MongoDB ObjectId of the job |

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "message": "Job started successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439029",
    "bookingId": "507f1f77bcf86cd799439021",
    "partnerId": "507f1f77bcf86cd799439023",
    "bidId": "507f1f77bcf86cd799439022",
    "status": "IN_PROGRESS",
    "startedAt": "2024-06-16T09:00:00.000Z",
    "completedAt": null,
    "invoiceUrl": null,
    "beforePhotos": [],
    "afterPhotos": [],
    "finalAmount": null,
    "createdAt": "2024-06-16T08:00:00.000Z",
    "updatedAt": "2024-06-16T09:00:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 400 | Job is not in NOT_STARTED status | `{ "success": false, "message": "Cannot start job in COMPLETED status", "errorCode": "VALIDATION_ERROR" }` |
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not PARTNER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | Job or partner profile not found | `{ "success": false, "message": "Job not found", "errorCode": "NOT_FOUND" }` |

---
### PATCH /api/partner/jobs/:id/complete
**Description:** Complete a job (must be in IN_PROGRESS status). Optionally provide `finalAmount`. Updates job and booking status to COMPLETED.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** PARTNER only

**Request Params (URL):**
| Name | Description |
|---|---|
| `id` | MongoDB ObjectId of the job |

**Request Body:**
```json
{
  "finalAmount": 3800
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Job completed successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439029",
    "bookingId": "507f1f77bcf86cd799439021",
    "partnerId": "507f1f77bcf86cd799439023",
    "bidId": "507f1f77bcf86cd799439022",
    "status": "COMPLETED",
    "startedAt": "2024-06-16T09:00:00.000Z",
    "completedAt": "2024-06-17T18:00:00.000Z",
    "invoiceUrl": null,
    "beforePhotos": [],
    "afterPhotos": [],
    "finalAmount": 3800,
    "createdAt": "2024-06-16T08:00:00.000Z",
    "updatedAt": "2024-06-17T18:00:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 400 | Job is not in IN_PROGRESS status | `{ "success": false, "message": "Cannot complete job in NOT_STARTED status", "errorCode": "VALIDATION_ERROR" }` |
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not PARTNER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | Job or partner profile not found | `{ "success": false, "message": "Job not found", "errorCode": "NOT_FOUND" }` |

---
### POST /api/partner/jobs/:id/invoice
**Description:** Upload an invoice URL for a completed job.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** PARTNER only

**Request Params (URL):**
| Name | Description |
|---|---|
| `id` | MongoDB ObjectId of the job |

**Request Body:**
```json
{
  "invoiceUrl": "https://res.cloudinary.com/carblink/image/upload/v1700000000/carblink/invoices/inv_123.pdf"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Invoice uploaded successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439029",
    "bookingId": "507f1f77bcf86cd799439021",
    "partnerId": "507f1f77bcf86cd799439023",
    "bidId": "507f1f77bcf86cd799439022",
    "status": "COMPLETED",
    "startedAt": "2024-06-16T09:00:00.000Z",
    "completedAt": "2024-06-17T18:00:00.000Z",
    "invoiceUrl": "https://res.cloudinary.com/carblink/image/upload/v1700000000/carblink/invoices/inv_123.pdf",
    "beforePhotos": [],
    "afterPhotos": [],
    "finalAmount": 3800,
    "createdAt": "2024-06-16T08:00:00.000Z",
    "updatedAt": "2024-06-17T18:30:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not PARTNER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | Job or partner profile not found | `{ "success": false, "message": "Job not found", "errorCode": "NOT_FOUND" }` |

---
### POST /api/partner/jobs/:id/photos
**Description:** Upload before/after photos for a job. Type must be `before` or `after`. Photos are synced to the related booking as well.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** PARTNER only

**Request Params (URL):**
| Name | Description |
|---|---|
| `id` | MongoDB ObjectId of the job |

**Request Body:**
```json
{
  "photos": [
    "https://res.cloudinary.com/carblink/image/upload/v1700000000/carblink/job-photos/before_1.jpg",
    "https://res.cloudinary.com/carblink/image/upload/v1700000000/carblink/job-photos/before_2.jpg"
  ],
  "type": "before"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Job photos uploaded and synced successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439029",
    "bookingId": "507f1f77bcf86cd799439021",
    "partnerId": "507f1f77bcf86cd799439023",
    "bidId": "507f1f77bcf86cd799439022",
    "status": "IN_PROGRESS",
    "startedAt": "2024-06-16T09:00:00.000Z",
    "completedAt": null,
    "invoiceUrl": null,
    "beforePhotos": [
      "https://res.cloudinary.com/carblink/image/upload/v1700000000/carblink/job-photos/before_1.jpg",
      "https://res.cloudinary.com/carblink/image/upload/v1700000000/carblink/job-photos/before_2.jpg"
    ],
    "afterPhotos": [],
    "finalAmount": null,
    "createdAt": "2024-06-16T08:00:00.000Z",
    "updatedAt": "2024-06-16T10:00:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not PARTNER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | Job or partner profile not found | `{ "success": false, "message": "Job not found", "errorCode": "NOT_FOUND" }` |

---
### POST /api/partner/jobs/:id/warranty
**Description:** Issue a warranty for a completed job. Creates a Warranty document linked to the booking and customer.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** PARTNER only

**Request Params (URL):**
| Name | Description |
|---|---|
| `id` | MongoDB ObjectId of the job |

**Request Body:**
```json
{
  "warrantyPeriodMonths": 6,
  "warrantyDocumentUrl": "https://res.cloudinary.com/carblink/image/upload/v1700000000/carblink/warranty-docs/warranty_123.pdf"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Warranty issued successfully for completed job",
  "data": {
    "_id": "507f1f77bcf86cd799439024",
    "bookingId": "507f1f77bcf86cd799439021",
    "customerId": "507f1f77bcf86cd799439011",
    "warrantyPeriodMonths": 6,
    "warrantyDocumentUrl": "https://res.cloudinary.com/carblink/image/upload/v1700000000/carblink/warranty-docs/warranty_123.pdf",
    "startDate": "2024-06-17T00:00:00.000Z",
    "expiryDate": "2024-12-17T00:00:00.000Z",
    "status": "ACTIVE",
    "createdAt": "2024-06-17T18:30:00.000Z",
    "updatedAt": "2024-06-17T18:30:00.000Z"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 400 | Job is not COMPLETED | `{ "success": false, "message": "Warranty can only be issued for completed jobs", "errorCode": "VALIDATION_ERROR" }` |
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not PARTNER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | Job, partner profile, or related booking not found | `{ "success": false, "message": "Job not found", "errorCode": "NOT_FOUND" }` |

---

## Partner — Earnings

---
### GET /api/partner/earnings
**Description:** Get the partner's total earnings for a specific period.  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** PARTNER only

**Request Query Params:**
| Name | Type | Required | Description | Default |
|---|---|---|---|---|
| `period` | string | No | Time period filter: `today`, `week`, `month`, or omit for all-time | `all` |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Earnings retrieved successfully",
  "data": {
    "totalEarnings": 12500,
    "period": "month"
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not PARTNER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | Partner profile not found | `{ "success": false, "message": "Partner profile not found", "errorCode": "NOT_FOUND" }` |

---
### GET /api/partner/earnings/summary
**Description:** Get the partner's lifetime earnings summary (total earnings and completed jobs count).  
**Auth Required:** Yes — Bearer token in Authorization header  
**Role Restriction:** PARTNER only

**Request Query Params:** None

**Success Response (200):**
```json
{
  "success": true,
  "message": "Earnings summary retrieved successfully",
  "data": {
    "lifetimeEarnings": 145000,
    "completedJobsCount": 42
  }
}
```

**Error Responses:**
| Status Code | When it happens | Example error body |
|---|---|---|
| 401 | No/invalid/expired token | `{ "success": false, "message": "Invalid or expired access token", "errorCode": "UNAUTHORIZED" }` |
| 403 | User is not PARTNER | `{ "success": false, "message": "You do not have permission to access this resource", "errorCode": "FORBIDDEN" }` |
| 404 | Partner profile not found | `{ "success": false, "message": "Partner profile not found", "errorCode": "NOT_FOUND" }` |

---
