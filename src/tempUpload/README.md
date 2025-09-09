# Temp Upload API Documentation

This documentation covers the temporary upload endpoints for generating pre-signed URLs before entity creation.

## Base URL

```
http://localhost:4000/api
```

## Authentication

All temp upload endpoints require authentication and email verification:

```
Authorization: Bearer <your_jwt_token>
```

---

## Temp Upload Endpoints

### Get Temporary Upload URL

Generate a pre-signed URL for temporary file uploads before creating entities (communities, posts, events, users).

**Endpoint:** `POST /temp-upload/url`  
**Authentication:** Required  
**Email Verification:** Required

**Request Body:**

```json
{
    "fileType": "image/jpeg",
    "entityType": "community",
    "imageType": "profile"
}
```

**Field Descriptions:**

-   `fileType` (required) - MIME type of the file
-   `entityType` (required) - Type of entity the image will be associated with
-   `imageType` (required) - Specific type of image for the entity

---

## Supported File Types

The following image file types are supported:

-   `image/jpeg` - JPEG format
-   `image/png` - PNG format  
-   `image/gif` - GIF format (including animations)
-   `image/webp` - WebP format (modern, efficient compression)

---

## Entity Types and Image Types

### Community

**Entity Type:** `community`  
**Supported Image Types:**

-   `profile` - Community profile/logo image
-   `banner` - Community cover/banner image

**Example Request:**

```json
{
    "fileType": "image/png",
    "entityType": "community",
    "imageType": "profile"
}
```

### User

**Entity Type:** `user`  
**Supported Image Types:**

-   `profile` - User profile picture
-   `banner` - User profile banner

**Example Request:**

```json
{
    "fileType": "image/jpeg",
    "entityType": "user",
    "imageType": "profile"
}
```

### Post

**Entity Type:** `post`  
**Supported Image Types:**

-   `content` - Post content image
-   `thumbnail` - Post thumbnail image

**Example Request:**

```json
{
    "fileType": "image/webp",
    "entityType": "post",
    "imageType": "content"
}
```

### Event

**Entity Type:** `event`  
**Supported Image Types:**

-   `cover` - Event cover image
-   `gallery` - Event gallery image

**Example Request:**

```json
{
    "fileType": "image/gif",
    "entityType": "event",
    "imageType": "cover"
}
```

---

## Response Format

### Success Response

```json
{
    "status": "success",
    "data": {
        "uploadUrl": "https://your-bucket.s3.amazonaws.com/community-temp-123/1691234567890-a1b2c3d4/profile.jpeg?X-Amz-Algorithm=...",
        "key": "community-temp-123/1691234567890-a1b2c3d4/profile.jpeg",
        "provider": "aws-s3",
        "entityType": "community",
        "imageType": "profile",
        "expiresIn": 3600
    }
}
```

**Response Field Descriptions:**

-   `uploadUrl` - Pre-signed URL for uploading the file
-   `key` - S3 object key/path for the uploaded file
-   `provider` - Storage provider (e.g., "aws-s3")
-   `entityType` - Echo of the requested entity type
-   `imageType` - Echo of the requested image type
-   `expiresIn` - URL expiration time in seconds (typically 3600 = 1 hour)

---

## How to Use the Upload URL

1. **Get the upload URL** using the endpoint above
2. **Upload your file** to the returned `uploadUrl` using PUT method:

```javascript
// Example using JavaScript fetch
const response = await fetch(uploadUrl, {
    method: "PUT",
    body: fileBlob,
    headers: {
        "Content-Type": fileType,
    },
});
```

3. **Use the key** when creating your entity (community, post, etc.):

```json
{
    "name": "My Community",
    "profile_image": {
        "provider": "aws-s3",
        "key": "community-temp-123/1691234567890-a1b2c3d4/profile.jpeg",
        "alt_text": "Community logo"
    }
}
```

---

## Postman Testing Examples

### Test Community Profile Image Upload

**Method:** POST  
**URL:** `{{url}}/api/temp-upload/url`  
**Headers:**

-   `Authorization: Bearer your_jwt_token`
-   `Content-Type: application/json`

**Body:**

```json
{
    "fileType": "image/jpeg",
    "entityType": "community",
    "imageType": "profile"
}
```

### Test User Banner Upload

**Method:** POST  
**URL:** `{{url}}/api/temp-upload/url`  
**Headers:**

-   `Authorization: Bearer your_jwt_token`
-   `Content-Type: application/json`

**Body:**

```json
{
    "fileType": "image/png",
    "entityType": "user",
    "imageType": "banner"
}
```

### Test Post Content Image Upload

**Method:** POST  
**URL:** `{{url}}/api/temp-upload/url`  
**Headers:**

-   `Authorization: Bearer your_jwt_token`
-   `Content-Type: application/json`

**Body:**

```json
{
    "fileType": "image/webp",
    "entityType": "post",
    "imageType": "content"
}
```

---

## Error Responses

### Validation Errors

```json
{
    "status": "error",
    "message": "Validation failed",
    "errors": [
        {
            "field": "fileType",
            "message": "Unsupported file type. Must be jpeg, png, gif, or webp"
        }
    ]
}
```

### Authentication Errors

```json
{
    "status": "error",
    "message": "Authentication required"
}
```

### Email Verification Required

```json
{
    "status": "error",
    "message": "Email verification required. Please verify your email before proceeding."
}
```

### Invalid Entity Type

```json
{
    "status": "error",
    "message": "Invalid entity type"
}
```

### Invalid Image Type for Entity

```json
{
    "status": "error",
    "message": "For communities, image type must be profile or banner"
}
```

---

## Common HTTP Status Codes

-   `200` - Success
-   `400` - Bad Request (validation errors)
-   `401` - Unauthorized (missing or invalid token)
-   `403` - Forbidden (email not verified)
-   `500` - Internal Server Error

---

## Upload Flow Example

### 1. Get Upload URL

```bash
POST /api/temp-upload/url
{
    "fileType": "image/jpeg",
    "entityType": "community",
    "imageType": "profile"
}
```

### 2. Upload File to S3

```bash
PUT https://bucket.s3.amazonaws.com/path/to/file.jpg
Content-Type: image/jpeg
Body: [binary file data]
```

### 3. Create Entity with Image

```bash
POST /api/communities
{
    "name": "My Community",
    "profile_image": {
        "provider": "aws-s3",
        "key": "community-temp-123/1691234567890-a1b2c3d4/profile.jpeg",
        "alt_text": "Community logo"
    }
}
```

---

## Security Notes

1. **Pre-signed URLs expire** - Typically valid for 1 hour
2. **Temporary uploads** - Files uploaded to temp paths should be moved/referenced when entities are created
3. **Authentication required** - All endpoints require valid JWT tokens
4. **Email verification** - Users must have verified email addresses
5. **File type validation** - Only specific image types are allowed
6. **Entity-specific validation** - Image types are validated per entity type

---

## Cleanup Considerations

-   Temporary uploads should be cleaned up if not used within a reasonable timeframe
-   Consider implementing cleanup jobs for orphaned temp files
-   Monitor S3 storage usage for temp uploads
