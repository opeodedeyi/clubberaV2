# Clubbera V2

A comprehensive social networking platform built with Node.js and PostgreSQL, featuring community management, real-time messaging, events, and subscription-based content.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Real-time Features](#real-time-features)
- [Contributing](#contributing)
- [License](#license)

## Features

### Community Management
- Create and manage communities with customizable settings
- Role-based access control (Owner, Admin, Moderator, Member)
- Community search with full-text search capabilities
- Community recommendations based on user interests
- Subscription-based communities with payment integration
- Content restrictions and moderation tools

### Social Features
- User posts with media support (images, videos)
- Real-time messaging and chat
- Event creation and management
- User tagging system
- Notifications for activities and interactions
- User profiles and authentication

### Real-time Capabilities
- Socket.IO integration for instant messaging
- Real-time notifications
- Live event updates
- Online status tracking

### Payment & Subscriptions
- Stripe payment integration
- Community subscription management
- Payment tracking and history
- Automated subscription renewals

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **PostgreSQL** - Primary database
- **Socket.IO** - Real-time bidirectional communication

### Authentication & Security
- **JWT (jsonwebtoken)** - Token-based authentication
- **bcrypt** - Password hashing
- **express-rate-limit** - API rate limiting
- **helmet** - HTTP security headers
- **cors** - Cross-Origin Resource Sharing

### File Storage & Processing
- **AWS S3** - Cloud file storage
- **Multer** - File upload handling
- **sharp** - Image processing

### Payment
- **Stripe** - Payment processing

### Email & Communication
- **Nodemailer** - Email sending
- **Google OAuth 2.0** - Social login

### Testing
- **Jest** - Testing framework
- **Supertest** - HTTP assertions

### Utilities
- **Joi** - Request validation
- **winston** - Logging
- **node-cron** - Task scheduling
- **moment-timezone** - Date/time manipulation

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **PostgreSQL** (v12 or higher)
- **AWS Account** (for S3 storage)
- **Stripe Account** (for payment processing)
- **Google Cloud Account** (for OAuth and email services)

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/motola/clubberaV2.git
   cd clubberaV2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory (see [Environment Variables](#environment-variables) section)

4. **Set up the database**
   
   See the [Database Setup](#database-setup) section for detailed instructions

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=clubbera_v2
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
S3_BUCKET_NAME=your_s3_bucket_name

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=your_google_redirect_uri

# Email (Gmail)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_app_password
EMAIL_FROM=noreply@clubbera.com

# Frontend URL
FRONTEND_URL=http://localhost:3001

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Database Setup

1. **Create a PostgreSQL database**
   ```bash
   createdb clubbera_v2
   ```

2. **Run migrations**
   
   The database schema is managed through SQL migration files located in the `migrations/` directory.
   
   ```bash
   psql -U your_db_user -d clubbera_v2 -f migrations/add_search_document_to_communities.sql
   ```

3. **Database Schema**

   The application uses the following main tables:
   - `users` - User accounts and profiles
   - `communities` - Community information
   - `community_members` - Community membership tracking
   - `posts` - User and community posts
   - `events` - Event management
   - `messages` - Direct and group messages
   - `notifications` - User notifications
   - `subscriptions` - Community subscriptions
   - `subscription_payments` - Payment records
   - `tags` - Tag system
   - And more...

   For detailed schema information, refer to the module-specific README files in the `src/` directory.
