# Authentication API Documentation

Base URL: `/api/auth`
Required Role: Public (except `/logout` and `/me`)

This module handles identity, registration, and session control for all system actors. It enables customers and partners to self-register via phone-based OTP verification, log in securely with email/phone credentials, refresh access tokens, and securely log out.

### Typical Implementation Order
1. **Implement Self-Registration UI** -> Hits `POST /api/auth/register` (triggers SMS verification logs).
2. **Implement OTP Verification Overlay** -> Hits `POST /api/auth/verify-otp` (saves verification flags and returns JWT tokens).
3. **Implement Login Screen** -> Hits `POST /api/auth/login` (supports email or phone + password).
4. **Implement Forgot Password Flow** -> Hits `POST /api/auth/forgot-password` (triggers OTP send) and `POST /api/auth/reset-password` (sets new password).
5. **Implement Session Refresh** -> Configures axios interceptors to hit `POST /api/auth/refresh-token` on token expiry.
6. **Implement User Profile Hydration** -> Hits `GET /api/auth/me` on startup.

---

## 1. Register User

**Method & Path:** `POST /api/auth/register`

**Auth Required:** No

**Role Restriction:** None (Self-registration is locked to roles `CUSTOMER` and `PARTNER` only)

**Request Body:**
```json
{
  "fullName": "string (required, min length 1)",
  "email": "string (required, must be valid email format)",
  "phone": "string (required, 10-15 digits, regex: ^\\+?[1-9]\\d{1,14}$)",
  "password": "string (required, min 8 chars, must contain at least 1 uppercase, 1 lowercase, 1 digit, and 1 special char)",
  "role": "string (required, must be either 'CUSTOMER' or 'PARTNER')"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "6a579a2d9d7e0794bbf322a7",
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "+919999988888",
      "role": "CUSTOMER",
      "isPhoneVerified": false,
      "isEmailVerified": false,
      "isActive": true,
      "deviceTokens": [],
      "createdAt": "2026-07-15T14:33:17.485Z",
      "updatedAt": "2026-07-15T14:33:17.485Z"
    },
    "message": "Registration successful. OTP sent for verification."
  }
}
```

**Error Responses:**
- **400 Bad Request (Validation Error)**:
  ```json
  {
    "success": false,
    "message": "Validation failed",
    "errors": [
      {
        "field": "email",
        "message": "Invalid email address"
      }
    ]
  }
  ```
- **409 Conflict (Email/Phone Already Registered)**:
  ```json
  {
    "success": false,
    "message": "Email is already registered"
  }
  ```

---

## 2. Verify OTP

**Method & Path:** `POST /api/auth/verify-otp`

**Auth Required:** No

**Role Restriction:** None

**Request Body:**
```json
{
  "identifier": "string (required, email or phone number used during registration)",
  "otp": "string (required, exactly 6 digits)"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "user": {
      "_id": "6a579a2d9d7e0794bbf322a7",
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "+919999988888",
      "role": "CUSTOMER",
      "isPhoneVerified": true,
      "isEmailVerified": false,
      "isActive": true,
      "deviceTokens": [],
      "createdAt": "2026-07-15T14:33:17.485Z",
      "updatedAt": "2026-07-15T14:33:17.485Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**Error Responses:**
- **401 Unauthorized (Invalid/Expired OTP)**:
  ```json
  {
    "success": false,
    "message": "Invalid or expired OTP"
  }
  ```
- **404 Not Found (User Not Found)**:
  ```json
  {
    "success": false,
    "message": "User not found"
  }
  ```

---

## 3. Login User

**Method & Path:** `POST /api/auth/login`

**Auth Required:** No

**Role Restriction:** None

**Request Body:**
```json
{
  "identifier": "string (required, email or phone number)",
  "password": "string (required, min length 1)"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "6a579a2d9d7e0794bbf322a7",
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "+919999988888",
      "role": "CUSTOMER",
      "isPhoneVerified": true,
      "isEmailVerified": false,
      "isActive": true,
      "deviceTokens": [],
      "createdAt": "2026-07-15T14:33:17.485Z",
      "updatedAt": "2026-07-15T14:33:17.485Z",
      "lastLoginAt": "2026-07-15T14:35:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**Error Responses:**
- **401 Unauthorized (Invalid Credentials or Account Suspended)**:
  ```json
  {
    "success": false,
    "message": "Invalid credentials"
  }
  ```

---

## 4. Refresh Access Token

**Method & Path:** `POST /api/auth/refresh-token`

**Auth Required:** No

**Role Restriction:** None

**Request Body:**
```json
{
  "refreshToken": "string (required, min length 1)"
}
```

**Success Response (200 OK):**
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
- **401 Unauthorized (Invalid Session or User Inactive)**:
  ```json
  {
    "success": false,
    "message": "Invalid session or user is inactive"
  }
  ```

---

## 5. Logout User

**Method & Path:** `POST /api/auth/logout`

**Auth Required:** Yes — Bearer token in `Authorization` header

**Role Restriction:** Any authenticated user

**Request Body:** None

**Success Response (200 OK):**
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
- **401 Unauthorized (Missing/Invalid Token)**:
  ```json
  {
    "success": false,
    "message": "Access token is missing or invalid"
  }
  ```

---

## 6. Forgot Password (Trigger Reset OTP)

**Method & Path:** `POST /api/auth/forgot-password`

**Auth Required:** No

**Role Restriction:** None

**Request Body:**
```json
{
  "identifier": "string (required, email or phone number)"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Reset OTP sent successfully",
  "data": {
    "message": "Reset OTP sent successfully"
  }
}
```

**Error Responses:**
- **404 Not Found (User Not Found)**:
  ```json
  {
    "success": false,
    "message": "User not found"
  }
  ```

---

## 7. Reset Password

**Method & Path:** `POST /api/auth/reset-password`

**Auth Required:** No

**Role Restriction:** None

**Request Body:**
```json
{
  "identifier": "string (required, email or phone number)",
  "token": "string (required, exactly 6-digit OTP reset token)",
  "newPassword": "string (required, standard password complexity constraints)"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset successful",
  "data": {
    "message": "Password has been reset successfully"
  }
}
```

**Error Responses:**
- **401 Unauthorized (Invalid or Expired Reset Token)**:
  ```json
  {
    "success": false,
    "message": "Invalid or expired reset token"
  }
  ```
- **404 Not Found (User Not Found)**:
  ```json
  {
    "success": false,
    "message": "User not found"
  }
  ```

---

## 8. Get Current Authenticated User Profile

**Method & Path:** `GET /api/auth/me`

**Auth Required:** Yes — Bearer token in `Authorization` header

**Role Restriction:** Any authenticated user

**Request Body:** None

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "User profile retrieved successfully",
  "data": {
    "_id": "6a579a2d9d7e0794bbf322a7",
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "+919999988888",
    "role": "CUSTOMER",
    "isPhoneVerified": true,
    "isEmailVerified": false,
    "isActive": true,
    "deviceTokens": [],
    "createdAt": "2026-07-15T14:33:17.485Z",
    "updatedAt": "2026-07-15T14:33:17.485Z"
  }
}
```

**Error Responses:**
- **401 Unauthorized (Missing/Invalid Token)**:
  ```json
  {
    "success": false,
    "message": "Access token is missing or invalid"
  }
  ```
