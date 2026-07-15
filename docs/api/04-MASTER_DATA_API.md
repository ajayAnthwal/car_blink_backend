# Master Data API Documentation

Base URL: `/api`
Required Role: Public (Read) / SUPER_ADMIN (Write)

This module provides operational reference data: cities, services, and vehicle configurations. Fetching this data is public (no authentication required), while creating, updating, or deleting reference data is restricted to the `SUPER_ADMIN` role only.

### Typical Implementation Order
1. **Fetch City List** -> Hits `GET /api/cities` to populate registration or profile forms.
2. **Fetch Services Offered** -> Hits `GET /api/services` to build service category navigation.
3. **Select Vehicle Brand** -> Hits `GET /api/vehicle-brands` to populate the brand dropdown in the Customer Garage form.
4. **Select Vehicle Model** -> Hits `GET /api/vehicle-models?brandId=<id>` dynamically when a brand is selected in the Customer Garage form.
5. **Manage Reference catalogs (Admin panel)** -> Hits write operations (`POST`, `PATCH`, `DELETE`) for cities, services, brands, and models.

---

## 1. Get Services Catalog (Paginated)

**Method & Path:** `GET /api/services`

**Auth Required:** No

**Role Restriction:** None

**Query Parameters:**
- `page`: `number (optional, default: 1, min: 1)`
- `limit`: `number (optional, default: 10, min: 1, max: 100)`

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Services retrieved successfully",
  "data": {
    "docs": [
      {
        "_id": "6a56fe37cd289f213b596a2b",
        "name": "Periodic Service",
        "icon": "periodic_service_icon_key",
        "category": "Maintenance",
        "isActive": true,
        "createdAt": "2026-07-15T08:00:00.000Z",
        "updatedAt": "2026-07-15T08:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

## 2. Get Operating Cities Catalog (Paginated)

**Method & Path:** `GET /api/cities`

**Auth Required:** No

**Role Restriction:** None

**Query Parameters:**
- `page`: `number (optional, default: 1, min: 1)`
- `limit`: `number (optional, default: 10, min: 1, max: 100)`

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Cities retrieved successfully",
  "data": {
    "docs": [
      {
        "_id": "6a56fe47cd289f213b596a39",
        "name": "Mumbai",
        "state": "Maharashtra",
        "isActive": true,
        "createdAt": "2026-07-15T08:00:00.000Z",
        "updatedAt": "2026-07-15T08:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

## 3. Get Vehicle Brands Catalog

**Method & Path:** `GET /api/vehicle-brands`

**Auth Required:** No

**Role Restriction:** None

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Vehicle brands retrieved successfully",
  "data": [
    {
      "_id": "6a578f7e4d2eeb54863b65ef",
      "name": "Maruti Suzuki",
      "logo": "https://res.cloudinary.com/demo/image/upload/maruti.png",
      "isActive": true,
      "createdAt": "2026-07-15T13:47:00.000Z",
      "updatedAt": "2026-07-15T13:47:00.000Z"
    }
  ]
}
```

---

## 4. Get Vehicle Models Catalog by Brand

**Method & Path:** `GET /api/vehicle-models`

**Auth Required:** No

**Role Restriction:** None

**Query Parameters:**
- `brandId`: `string (required, MongoDB ObjectId)`

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Vehicle models retrieved successfully",
  "data": [
    {
      "_id": "6a578f7e4d2eeb54863b65f3",
      "brandId": {
        "_id": "6a578f7e4d2eeb54863b65ef",
        "name": "Maruti Suzuki",
        "logo": "https://res.cloudinary.com/demo/image/upload/maruti.png",
        "isActive": true
      },
      "name": "Swift",
      "isActive": true,
      "createdAt": "2026-07-15T13:47:00.000Z",
      "updatedAt": "2026-07-15T13:47:00.000Z"
    }
  ]
}
```

**Error Responses:**
- **404 Not Found (Brand Not Found/Inactive)**:
  ```json
  {
    "success": false,
    "message": "Vehicle brand not found"
  }
  ```

---

## 5. Create Service Category

**Method & Path:** `POST /api/services`

**Auth Required:** Yes — Bearer token in `Authorization` header

**Role Restriction:** `SUPER_ADMIN` only

**Request Body:**
```json
{
  "name": "string (required, min length 1)",
  "icon": "string (required, key/URL, min length 1)",
  "category": "string (optional)"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Service created successfully",
  "data": {
    "_id": "6a56fe37cd289f213b596a2b",
    "name": "Periodic Service",
    "icon": "periodic_service_icon_key",
    "category": "Maintenance",
    "isActive": true,
    "createdAt": "2026-07-15T14:35:00.000Z",
    "updatedAt": "2026-07-15T14:35:00.000Z"
  }
}
```

**Error Responses:**
- **401 Unauthorized (Invalid/Expired Token)**:
  ```json
  {
    "success": false,
    "message": "Access token is missing or invalid"
  }
  ```
- **403 Forbidden (Missing Super Admin Role)**:
  ```json
  {
    "success": false,
    "message": "Access denied"
  }
  ```

---

## 6. Update Service Category

**Method & Path:** `PATCH /api/services/:id`

**Auth Required:** Yes — Bearer token in `Authorization` header

**Role Restriction:** `SUPER_ADMIN` only

**Request Body:**
```json
{
  "name": "string (optional)",
  "icon": "string (optional)",
  "category": "string (optional)"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Service updated successfully",
  "data": {
    "_id": "6a56fe37cd289f213b596a2b",
    "name": "Periodic Service Updated",
    "icon": "periodic_service_icon_key",
    "category": "Maintenance",
    "isActive": true,
    "createdAt": "2026-07-15T08:00:00.000Z",
    "updatedAt": "2026-07-15T14:35:00.000Z"
  }
}
```

**Error Responses:**
- **404 Not Found (Service category not found)**:
  ```json
  {
    "success": false,
    "message": "Service category not found"
  }
  ```

---

## 7. Delete Service Category (Logical Deactivation)

**Method & Path:** `DELETE /api/services/:id`

**Auth Required:** Yes — Bearer token in `Authorization` header

**Role Restriction:** `SUPER_ADMIN` only

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Service deleted successfully",
  "data": {
    "_id": "6a56fe37cd289f213b596a2b",
    "name": "Periodic Service",
    "icon": "periodic_service_icon_key",
    "category": "Maintenance",
    "isActive": false,
    "createdAt": "2026-07-15T08:00:00.000Z",
    "updatedAt": "2026-07-15T14:35:00.000Z"
  }
}
```

---

## 8. Create Operating City

**Method & Path:** `POST /api/cities`

**Auth Required:** Yes — Bearer token in `Authorization` header

**Role Restriction:** `SUPER_ADMIN` only

**Request Body:**
```json
{
  "name": "string (required, min length 1)",
  "state": "string (required, min length 1)"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "City created successfully",
  "data": {
    "_id": "6a56fe47cd289f213b596a39",
    "name": "Mumbai",
    "state": "Maharashtra",
    "isActive": true,
    "createdAt": "2026-07-15T14:35:00.000Z",
    "updatedAt": "2026-07-15T14:35:00.000Z"
  }
}
```

---

## 9. Update Operating City

**Method & Path:** `PATCH /api/cities/:id`

**Auth Required:** Yes — Bearer token in `Authorization` header

**Role Restriction:** `SUPER_ADMIN` only

**Request Body:**
```json
{
  "name": "string (optional)",
  "state": "string (optional)"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "City updated successfully",
  "data": {
    "_id": "6a56fe47cd289f213b596a39",
    "name": "Mumbai Updated",
    "state": "Maharashtra",
    "isActive": true,
    "createdAt": "2026-07-15T08:00:00.000Z",
    "updatedAt": "2026-07-15T14:35:00.000Z"
  }
}
```

**Error Responses:**
- **404 Not Found (City not found)**:
  ```json
  {
    "success": false,
    "message": "City not found"
  }
  ```

---

## 10. Delete Operating City (Logical Deactivation)

**Method & Path:** `DELETE /api/cities/:id`

**Auth Required:** Yes — Bearer token in `Authorization` header

**Role Restriction:** `SUPER_ADMIN` only

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "City deleted successfully",
  "data": {
    "_id": "6a56fe47cd289f213b596a39",
    "name": "Mumbai",
    "state": "Maharashtra",
    "isActive": false,
    "createdAt": "2026-07-15T08:00:00.000Z",
    "updatedAt": "2026-07-15T14:35:00.000Z"
  }
}
```

---

## 11. Create Vehicle Brand

**Method & Path:** `POST /api/vehicle-brands`

**Auth Required:** Yes — Bearer token in `Authorization` header

**Role Restriction:** `SUPER_ADMIN` only

**Request Body:**
```json
{
  "name": "string (required, min length 1)",
  "logo": "string (optional, URL)"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Vehicle brand created successfully",
  "data": {
    "_id": "6a578f7e4d2eeb54863b65ef",
    "name": "Maruti Suzuki",
    "logo": "https://res.cloudinary.com/demo/image/upload/maruti.png",
    "isActive": true,
    "createdAt": "2026-07-15T14:35:00.000Z",
    "updatedAt": "2026-07-15T14:35:00.000Z"
  }
}
```

---

## 12. Create Vehicle Model

**Method & Path:** `POST /api/vehicle-models`

**Auth Required:** Yes — Bearer token in `Authorization` header

**Role Restriction:** `SUPER_ADMIN` only

**Request Body:**
```json
{
  "brandId": "string (required, 24-char hex MongoDB ObjectId)",
  "name": "string (required, min length 1)"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Vehicle model created successfully",
  "data": {
    "_id": "6a578f7e4d2eeb54863b65f3",
    "brandId": {
      "_id": "6a578f7e4d2eeb54863b65ef",
      "name": "Maruti Suzuki",
      "logo": "https://res.cloudinary.com/demo/image/upload/maruti.png",
      "isActive": true
    },
    "name": "Swift",
    "isActive": true,
    "createdAt": "2026-07-15T14:35:00.000Z",
    "updatedAt": "2026-07-15T14:35:00.000Z"
  }
}
```

**Error Responses:**
- **404 Not Found (Vehicle brand not found)**:
  ```json
  {
    "success": false,
    "message": "Vehicle brand not found"
  }
  ```
