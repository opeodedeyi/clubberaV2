# User API Documentation

## Overview

This API provides user management functionality including authentication, profile management, account administration, and image handling. The API is organized into three main route groups:

## Authentication & Authorization

-   **Authentication**: Required endpoints use JWT tokens via the `authMiddleware.authenticate`
-   **Role-based Access**: Some endpoints require specific roles (`user`, `staff`, `superuser`)
-   **Token Format**: Include JWT token in Authorization header: `Bearer <token>`

---

## Routes

### User Routes (`/api/users`)

#### **Public Routes**

**GET `/profile/:uniqueUrl`** - Get user profile by unique URL (Public/Optional Auth)

```json
// Example: GET /api/users/profile/opeyemi-odedeyi
// Headers (optional): Authorization: Bearer <token>

// Response (200) - When not logged in or viewing someone else's profile
{
    "status": "success",
    "data": {
        "id": 2,
        "fullName": "Opeyemi Odedeyi",
        "uniqueUrl": "opeyemi-odedeyi",
        "bio": "A great man",
        "gender": "male",
        "profileImage": {
            "id": 1,
            "key": "user/2/profile/uuid.jpg",
            "altText": "Profile picture",
            "provider": "aws-s3",
            "url": "https://s3.amazonaws.com/bucket/user/2/profile/uuid.jpg"
        },
        "bannerImage": null,
        "location": {
            "city": "Nottingham, UK",
            "lat": 52.950001,
            "lng": -1.150000,
            "address": null
        },
        "interests": ["technology", "music"],
        "skills": ["javascript", "node.js"],
        "dateJoined": "2025-07-20T10:57:59.849Z",
        "isOwner": false,
        "isLoggedIn": false,
        "ownsCommunity": false
    }
}

// Response (200) - When logged in and viewing own profile
{
    "status": "success",
    "data": {
        "id": 2,
        "fullName": "Opeyemi Odedeyi",
        "uniqueUrl": "opeyemi-odedeyi",
        "email": "opeyemiodedeyi@gmail.com",  // ← Only shown to owner
        "isEmailConfirmed": false,            // ← Only shown to owner
        "birthday": "1990-05-15",             // ← Only shown to owner
        "preferences": {"theme": "dark"},     // ← Only shown to owner
        "role": "user",                       // ← Only shown to owner
        "isActive": true,                     // ← Only shown to owner
        "bio": "A great man",
        "gender": "male",
        "profileImage": { /* ... */ },
        "bannerImage": null,
        "location": { /* ... */ },
        "interests": ["technology", "music"],
        "skills": ["javascript", "node.js"],
        "dateJoined": "2025-07-20T10:57:59.849Z",
        "isOwner": true,                      // ← Owner viewing own profile
        "isLoggedIn": true,                   // ← User is authenticated
        "ownsCommunity": false
    }
}

// Response (200) - When logged in but viewing someone else's profile
{
    "status": "success",
    "data": {
        "id": 3,
        "fullName": "Jane Smith",
        "uniqueUrl": "jane-smith",
        "bio": "Designer and artist",
        "gender": "female",
        "profileImage": { /* ... */ },
        "bannerImage": null,
        "location": { /* ... */ },
        "interests": ["design", "art"],
        "skills": ["photoshop", "illustrator"],
        "dateJoined": "2025-06-15T14:20:00.000Z",
        "isOwner": false,                     // ← Not the owner
        "isLoggedIn": true,                   // ← User is authenticated
        "ownsCommunity": false
        // Note: Email, birthday, preferences, etc. are hidden for privacy
    }
}
```

**POST `/create-user`** - Register a new user

```json
// Request Body
{
    "email": "user@example.com",
    "password": "Password123",
    "fullName": "John Doe",
    "bio": "Optional bio text",
    "gender": "male|female|other",
    "birthday": "1990-01-01",
    "preferences": {},
    "location": {
        "city": "New York",
        "lat": 40.7128,
        "lng": -74.0060
    }
}

// Response (201)
{
    "status": "success",
    "message": "User registered successfully. Please check your email to confirm your account.",
    "data": {
        "id": 1,
        "fullName": "John Doe",
        "email": "user@example.com",
        "uniqueUrl": null,
        "isEmailConfirmed": false,
        "createdAt": "2025-01-20T10:00:00Z"
    }
}
```

**POST `/login`** - Authenticate user

```json
// Request Body
{
    "email": "user@example.com",
    "password": "Password123"
}

// Response (200)
{
    "status": "success",
    "message": "Login successful",
    "data": {
        "user": { /* full user profile */ },
        "token": "jwt_token_here"
    }
}
```

**POST `/logout`** - Logout user

```json
// Request Body
{
    "token": "jwt_token_here" // Optional
}

// Response (200)
{
    "status": "success",
    "message": "Logged out successfully",
    "data": {}
}
```

#### **Password Management**

**POST `/forgot-password`** - Request password reset

```json
// Request Body
{
    "email": "user@example.com"
}

// Response (200)
{
    "status": "success",
    "message": "If your email is registered, you will receive a password reset link shortly",
    "data": {}
}
```

**POST `/reset-password`** - Reset password with token

```json
// Request Body
{
    "token": "reset_token_from_email",
    "newPassword": "NewPassword123"
}

// Response (200)
{
    "status": "success",
    "message": "Password has been reset successfully",
    "data": {}
}
```

#### **Passwordless Authentication**

**POST `/passwordless-request`** - Request passwordless login link

```json
// Request Body
{
    "email": "user@example.com"
}

// Response (200)
{
    "status": "success",
    "message": "If your email is registered, you will receive a login link shortly",
    "data": {}
}
```

**POST `/passwordless-verify`** - Verify passwordless login token

```json
// Request Body
{
    "token": "passwordless_token_from_email"
}

// Response (200)
{
    "status": "success",
    "message": "Login successful",
    "data": {
        "user": { /* full user profile */ },
        "token": "jwt_token_here"
    }
}
```

#### **Email Verification**

**POST `/verify-email-code-request`** - Request email verification code (🔒 Auth Required)

```json
// Request Body
{
    "email": "user@example.com"
}

// Response (200)
{
    "status": "success",
    "message": "Verification code sent to your email",
    "data": {}
}
```

**POST `/verify-email-code`** - Verify email with code

```json
// Request Body
{
    "email": "user@example.com",
    "verificationCode": "123456"
}

// Response (200)
{
    "status": "success",
    "message": "Email verified successfully",
    "data": {}
}
```

**POST `/verify-email-link-request`** - Request email verification link (🔒 Auth Required)

```json
// Response (200)
{
    "status": "success",
    "message": "Verification link sent to your email",
    "data": {}
}
```

**GET `/verify-email?token=verification_token`** - Verify email with link

```json
// Response (200)
{
    "status": "success",
    "message": "Email verified successfully",
    "data": {}
}
```

#### **Google Authentication**

**POST `/google-login`** - Authenticate with Google

```json
// Request Body (either code OR idToken required)
{
    "code": "google_auth_code", // OR
    "idToken": "google_id_token"
}

// Response (200)
{
    "status": "success",
    "message": "Google login successful",
    "data": {
        "user": { /* full user profile */ },
        "token": "jwt_token_here"
    }
}
```

#### **Protected Routes** (🔒 Auth Required)

**GET `/profile`** - Get user profile

```json
// Response (200)
{
    "status": "success",
    "data": {
        "id": 1,
        "fullName": "John Doe",
        "email": "user@example.com",
        "bio": "User bio",
        "gender": "male",
        "birthday": "1990-01-01",
        "preferences": {},
        "isEmailConfirmed": true,
        "isActive": true,
        "role": "user",
        "images": [
            {
                "imageType": "profile",
                "provider": "aws-s3",
                "key": "s3_key",
                "position": 0
            }
        ],
        "interests": [
            { "id": 1, "name": "technology" },
            { "id": 2, "name": "music" }
        ],
        "location": {
            "lat": 40.7128,
            "lng": -74.006,
            "address": "New York, NY"
        }
    }
}
```

**PUT `/profile`** - Update user profile

```json
// Request Body (all fields optional)
{
    "fullName": "Jane Doe",
    "bio": "Updated bio",
    "gender": "female",
    "birthday": "1992-05-15",
    "location": {
        "city": "Los Angeles",
        "lat": 34.0522,
        "lng": -118.2437
    },
    "preferences": {
        "theme": "dark",
        "notifications": true
    }
}

// Response (200)
{
    "status": "success",
    "message": "Profile updated successfully",
    "data": { /* updated user profile */ }
}
```

**PUT `/interests`** - Update user interests

```json
// Request Body
{
    "interests": ["technology", "music", "travel", "photography"]
}

// Response (200)
{
    "status": "success",
    "message": "Interests updated successfully",
    "data": { /* updated user profile */ }
}
```

**PUT `/password`** - Change password

```json
// Request Body
{
    "currentPassword": "CurrentPassword123",
    "newPassword": "NewPassword123"
}

// Response (200)
{
    "status": "success",
    "message": "Password changed successfully",
    "data": {}
}
```

---

### Account Management Routes (`/account`)

#### **User Account Management** (🔒 Auth Required)

**PUT `/deactivate`** - Deactivate own account

```json
// Response (200)
{
    "status": "success",
    "message": "Account deactivated successfully",
    "data": {
        "id": 1,
        "email": "user@example.com",
        "isActive": false
    }
}
```

**PUT `/reactivate`** - Reactivate account

```json
// Request Body
{
    "email": "user@example.com",
    "password": "Password123"
}

// Response (200)
{
    "status": "success",
    "message": "Account reactivated successfully",
    "data": {
        "id": 1,
        "email": "user@example.com",
        "isActive": true
    }
}
```

#### **Admin Routes** (🔒 Auth Required + Role)

**GET `/users`** - Get all users (👥 Staff/Superuser only)

```json
// Response (200)
{
    "status": "success",
    "data": [
        {
            "id": 1,
            "fullName": "John Doe",
            "email": "user@example.com",
            "role": "user",
            "isActive": true,
            "isEmailConfirmed": true,
            "createdAt": "2025-01-20T10:00:00Z"
        }
    ]
}
```

**PUT `/users/:id/role`** - Update user role (👑 Superuser only)

```json
// Request Body
{
    "role": "staff" // "user" | "staff" | "superuser"
}

// Response (200)
{
    "status": "success",
    "message": "User role updated successfully",
    "data": {
        "id": 1,
        "email": "user@example.com",
        "role": "staff"
    }
}
```

**PUT `/users/:id/status`** - Update user status (👥 Staff/Superuser only)

```json
// Request Body
{
    "isActive": false
}

// Response (200)
{
    "status": "success",
    "message": "User account deactivated successfully",
    "data": {
        "id": 1,
        "email": "user@example.com",
        "isActive": false
    }
}
```

---

### Image Management Routes (`/images`)

All image routes require authentication (🔒).

**POST `/images/upload-url`** - Get pre-signed URL for S3 upload

```json
// Request Body
{
    "fileType": "image/jpeg", // "image/jpeg" | "image/png" | "image/gif" | "image/webp"
    "imageType": "profile"    // "profile" | "banner"
}

// Response (200)
{
    "status": "success",
    "data": {
        "uploadUrl": "https://s3.amazonaws.com/...",
        "key": "user/123/profile/uuid.jpg",
        "fields": { /* S3 form fields */ }
    }
}
```

**POST `/images/save`** - Save image metadata after upload

```json
// Request Body
{
    "key": "user/123/profile/uuid.jpg",
    "imageType": "profile", // Optional, defaults to "profile"
    "altText": "Profile picture" // Optional
}

// Response (200)
{
    "status": "success",
    "message": "Profile image updated successfully",
    "data": {
        "image": {
            "id": 1,
            "imageType": "profile",
            "provider": "aws-s3",
            "key": "user/123/profile/uuid.jpg",
            "altText": "Profile picture",
            "position": 0
        },
        "profile": { /* updated user profile */ }
    }
}
```

**DELETE `/images?type=profile`** - Delete profile image

```json
// Query Parameters
// type: "profile" | "banner" (optional, defaults to "profile")

// Response (200)
{
    "status": "success",
    "message": "Profile image deleted successfully",
    "data": {
        /* updated user profile */
    }
}
```

---

## Validation Rules

### Password Requirements

-   Minimum 8 characters
-   At least one uppercase letter
-   At least one lowercase letter
-   At least one number

### User Data Constraints

-   **Full Name**: Minimum 2 characters
-   **Interests**: Maximum 20 items, each 2-30 characters, alphanumeric + spaces + hyphens only
-   **Bio**: String (no length limit specified)
-   **Birthday**: ISO 8601 date format
-   **Latitude**: -90 to 90
-   **Longitude**: -180 to 180
-   **Image Alt Text**: Maximum 255 characters

### File Upload Constraints

-   **Supported formats**: JPEG, PNG, WebP
-   **Image types**: profile, banner

---

## Error Responses

All endpoints return errors in this format:

```json
{
    "status": "error",
    "message": "Error description",
    "errors": [
        /* validation errors array (when applicable) */
    ]
}
```

Common HTTP status codes:

-   `400` - Bad Request (validation errors)
-   `401` - Unauthorized (authentication required)
-   `403` - Forbidden (insufficient permissions)
-   `404` - Not Found
-   `500` - Internal Server Error
