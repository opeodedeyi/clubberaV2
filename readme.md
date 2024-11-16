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

## Running the Application

### Development Mode

Start the server with automatic restart on file changes:

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or the PORT specified in your `.env` file).

### Production Mode

```bash
npm start
```

### Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

## API Documentation

The API is organized into the following modules:

### Core Modules

#### User Management (`/src/user`)
- User registration and authentication
- Profile management
- Password reset and email verification
- Google OAuth integration
- User preferences and settings

#### Community (`/src/community`)
- Create, update, and delete communities
- Community search with full-text capabilities
- Community recommendations
- Role-based permissions (Owner, Admin, Moderator, Member)
- Community subscriptions and payments
- Member management

#### Posts (`/src/post`)
- Create, update, and delete posts
- Media uploads (images, videos)
- Post interactions (likes, comments)
- Feed generation

#### Events (`/src/event`)
- Create and manage events
- Event attendance tracking
- Event notifications
- Calendar integration

#### Messaging (`/src/message`)
- Direct messaging
- Group chats
- Real-time message delivery via Socket.IO
- Message history and search

#### Notifications (`/src/notification`)
- Activity notifications
- System notifications
- Push notification support
- Notification preferences

#### Tags (`/src/tag`)
- Tag creation and management
- Tag-based content discovery
- Popular tags

### Supporting Modules

- **Community Support** (`/src/communitySupport`) - Support ticket system
- **Help** (`/src/help`) - Help center and FAQs
- **Subscriptions** (`/src/subscription`) - Subscription management
- **Temp Upload** (`/src/tempUpload`) - Temporary file uploads

For detailed API endpoints and request/response formats, refer to the README files in each module directory.

## Testing

The project uses **Jest** and **Supertest** for testing.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Structure

Tests are organized by module in their respective `tests/` directories:
- `/src/user/tests/` - User module tests
- `/src/community/tests/` - Community module tests
- `/src/post/tests/` - Post module tests
- `/src/event/tests/` - Event module tests
- And more...

### Test Helpers

Common test utilities are available in `/src/test-helpers/`:
- `database.helper.js` - Database setup and teardown
- `test-setup.js` - Global test configuration

### Writing Tests

Each module should have comprehensive tests covering:
- Controller logic
- Model methods
- Route handlers
- Validation schemas
- Integration tests

## Project Structure

```
clubberaV2/
├── src/
│   ├── community/          # Community management module
│   │   ├── controllers/    # Request handlers
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── tests/          # Module tests
│   │   └── validators/     # Request validation
│   │
│   ├── user/               # User management module
│   ├── post/               # Posts module
│   ├── event/              # Events module
│   ├── message/            # Messaging module
│   ├── notification/       # Notifications module
│   ├── tag/                # Tags module
│   ├── subscription/       # Subscriptions module
│   ├── communitySupport/   # Support tickets
│   ├── help/               # Help center
│   ├── tempUpload/         # Temporary uploads
│   │
│   ├── middleware/         # Express middleware
│   │   ├── auth.js         # Authentication
│   │   ├── role.js         # Authorization
│   │   └── validate.js     # Request validation
│   │
│   ├── services/           # Shared services
│   │   ├── email.service.js
│   │   ├── s3.service.js
│   │   ├── payment.service.js
│   │   └── token.service.js
│   │
│   ├── config/             # Configuration
│   │   ├── db.js           # Database config
│   │   └── socket.js       # Socket.IO config
│   │
│   ├── utils/              # Utility functions
│   │   ├── ApiError.js
│   │   ├── catchAsync.js
│   │   └── timezone.helper.js
│   │
│   └── test-helpers/       # Test utilities
│
├── migrations/             # Database migrations
├── index.js                # Application entry point
├── package.json            # Dependencies
├── jest.config.js          # Jest configuration
└── .env                    # Environment variables (not in repo)
```

## Real-time Features

The application uses **Socket.IO** for real-time bidirectional communication.

### Socket Configuration

Socket.IO is configured in `/src/config/socket.js` and initialized in `index.js`.

### Real-time Capabilities

- **Instant Messaging** - Real-time chat messages
- **Notifications** - Live notification delivery
- **Online Status** - Track user presence
- **Event Updates** - Live event notifications
- **Typing Indicators** - Show when users are typing

### Testing Socket Connections

A test client is available at `test-socket-client.js` for testing Socket.IO connections:

```bash
node test-socket-client.js
```

### Socket Events

The application emits and listens to various socket events for different modules. Refer to the Socket.IO configuration file for detailed event specifications.
