# User Profile API Documentation

Base URL: `/api/users`
Required Role: Any authenticated role

This module handles user profile actions. It allows authenticated users to fetch their current profile, modify their basic profile details, update their account passwords securely, register mobile/web push device tokens, and self-deactivate their accounts.

### Typical Implementation Order
1. **Build User Settings/Profile Screen** -> Hits `GET /api/users/profile` on load.
2. **Implement Edit Profile Form** -> Hits `PATCH /api/users/profile` on save (supports updating profileImage url and fullName).
3. **Implement Register Push Device Token** -> On app load, retrieves Firebase Cloud Messaging (FCM) token and registers it via `PATCH /api/users/device-token`.
4. **Implement Change Password Modal** -> Hits `PATCH /api/users/change-password`.
5. **Implement Self-Deactivation Flow** -> Hits `PATCH /api/users/deactivate` with confirmation, followed by removing local session tokens and redirecting to login.

---

## 1. Get User Profile

**Method & Path:** `GET /api/users/profile`

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
    "deviceTokens": ["fcm_token_12345"],
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
- **404 Not Found (User Not Found or Inactive)**:
  ```json
  {
    "success": false,
    "message": "User not found"
  }
  ```

---

## 2. Update User Profile

**Method & Path:** `PATCH /api/users/profile`

**Auth Required:** Yes — Bearer token in `Authorization` header

**Role Restriction:** Any authenticated user

**Request Body:**
```json
{
  "fullName": "string (optional, min length 1)",
  "profileImage": "string (optional, min length 1)"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "User profile updated successfully",
  "data": {
    "_id": "6a579a2d9d7e0794bbf322a7",
    "fullName": "John Updated",
    "email": "john@example.com",
    "phone": "+919999988888",
    "role": "CUSTOMER",
    "isPhoneVerified": true,
    "isEmailVerified": false,
    "isActive": true,
    "profileImage": "https://res.cloudinary.com/demo/image/upload/profile.jpg",
    "deviceTokens": ["fcm_token_12345"],
    "createdAt": "2026-07-15T14:33:17.485Z",
    "updatedAt": "2026-07-15T14:35:00.000Z"
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
        "field": "fullName",
        "message": "Full name cannot be empty"
      }
    ]
  }
  ```
- **401 Unauthorized (Missing/Invalid Token)**:
  ```json
  {
    "success": false,
    "message": "Access token is missing or invalid"
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

## 3. Change Account Password

**Method & Path:** `PATCH /api/users/change-password`

**Auth Required:** Yes — Bearer token in `Authorization` header

**Role Restriction:** Any authenticated user

**Request Body:**
```json
{
  "currentPassword": "string (required, min length 1)",
  "newPassword": "string (required, password complexity regex checks)",
  "confirmNewPassword": "string (required, must match newPassword)"
}
```

**Success Response (200 OK):**
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
- **400 Bad Request (Validation Error / Mismatched Confirmation)**:
  ```json
  {
    "success": false,
    "message": "New passwords do not match"
  }
  ```
- **401 Unauthorized (Current Password Incorrect or Token Invalid)**:
  ```json
  {
    "success": false,
    "message": "Current password is incorrect"
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

## 4. Deactivate Own Account

**Method & Path:** `PATCH /api/users/deactivate`

**Auth Required:** Yes — Bearer token in `Authorization` header

**Role Restriction:** Any authenticated user

**Request Body:** None

**Success Response (200 OK):**
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
- **401 Unauthorized (Missing/Invalid Token)**:
  ```json
  {
    "success": false,
    "message": "Access token is missing or invalid"
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

## 5. Register Push Device Token

**Method & Path:** `PATCH /api/users/device-token`

**Auth Required:** Yes — Bearer token in `Authorization` header

**Role Restriction:** Any authenticated user

**Request Body:**
```json
{
  "deviceToken": "string (required, min length 1)"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Device token registered successfully",
  "data": {
    "success": true
  }
}
```

**Error Responses:**
- **400 Bad Request (Validation Error)**:
  ```json
  {
    "success": false,
    "message": "Device token is required"
  }
  ```
- **401 Unauthorized (Missing/Invalid Token)**:
  ```json
  {
    "success": false,
    "message": "Access token is missing or invalid"
  }
  ```
- **404 Not Found (User Not Found)**:
  ```json
  {
    "success": false,
    "message": "User not found"
  }
  ```
