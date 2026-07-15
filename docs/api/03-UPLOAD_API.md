# Upload API Documentation

Base URL: `/api/upload`
Required Role: Any authenticated role

This module handles asset file uploads (images, PDFs, documents) directly to Cloudinary storage. It accepts multipart files via Multer middleware and pipes them directly through the Cloudinary SDK, returning a public URL.

### Typical Implementation Order
1. **Implement Photo Attachment Picker (Frontend)** -> Selects image (JPEG/PNG/PDF).
2. **Build Multipart Payload request** -> Append key `file` as binary attachment, and optional `folder` as text payload.
3. **Upload & Capture Response** -> Hits `POST /api/upload`, extracts the returned `fileUrl` and binds it to other forms (e.g. KYC document url, support ticket attachments, profile images, job progress photos).

---

## 1. Upload Single File

**Method & Path:** `POST /api/upload`

**Auth Required:** Yes — Bearer token in `Authorization` header

**Role Restriction:** Any authenticated user

**Request Body (Multipart Form-Data):**
- **file**: `File Binary (required, standard image formats or PDF)`
- **folder**: `string (optional body parameter, e.g. 'kyc', 'profile', 'job_progress', defaults to 'general')`

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "fileUrl": "https://res.cloudinary.com/demo/image/upload/v1234567/general/filename.jpg"
  }
}
```

**Error Responses:**
- **400 Bad Request (Missing File or Size/Type Validation Failures)**:
  ```json
  {
    "success": false,
    "message": "No file uploaded"
  }
  ```
- **401 Unauthorized (Missing/Invalid Token)**:
  ```json
  {
    "success": false,
    "message": "Access token is missing or invalid"
  }
  ```
- **500 Internal Server Error (Cloudinary API Upload Failure)**:
  ```json
  {
    "success": false,
    "message": "Failed to upload file to Cloudinary"
  }
  ```
