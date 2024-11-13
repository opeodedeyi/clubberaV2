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
