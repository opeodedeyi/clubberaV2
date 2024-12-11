# Subscription Module

High-level documentation for managing subscription plans, user subscriptions, renewals, payments, and webhooks.

This module integrates with Stripe for payment processing and supports subscription-based access to communities and premium features.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Data Model](#data-model)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Workflows](#workflows)
- [Webhooks](#webhooks)
- [Errors](#errors)
- [Testing](#testing)
- [Examples](#examples)

## Overview

The Subscription module provides plan management, subscription lifecycle handling (start, renew, cancel), payment tracking, and webhook processing for Stripe events.

## Features

- Create and manage subscription plans (price, interval, currency)
- Subscribe/unsubscribe users to plans
- Trial support and proration (Stripe-managed)
- Automatic renewals via Stripe
- Webhook handling for invoice/payment events
- Payment history and receipts
- Community access gating for subscribers

## Data Model

Core tables used by this module (names may vary depending on your implementation):

- `subscription_plans` – plan definitions (id, name, description, price_cents, currency, interval, stripe_price_id)
- `subscriptions` – user subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end)
- `subscription_payments` – payment/invoice records (id, subscription_id, amount_cents, currency, status, stripe_invoice_id, stripe_payment_intent_id)

Related models can be found under `src/subscription/models/` and community-related subscription access under `src/community/models/` (e.g., `subscription.model.js`, `subscriptionPayment.model.js`).

## Environment Variables

Ensure these keys exist in your root `.env` (see root README for full list):

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
FRONTEND_URL=http://localhost:3001
```

Notes:
- Webhooks require the exact `STRIPE_WEBHOOK_SECRET` from your Stripe dashboard or CLI.
- Use test keys locally; never commit secrets.

## API Endpoints

Base path may vary (e.g., `/api/subscriptions`). The following describes typical routes:

### Plans
- `POST /plans` – Create a plan (admin)
- `GET /plans` – List plans
- `GET /plans/:planId` – Get plan detail
- `PATCH /plans/:planId` – Update plan (admin)
- `DELETE /plans/:planId` – Archive/delete plan (admin)

### Subscriptions
- `POST /` – Create a subscription for the authenticated user (planId required)
- `GET /` – List current user subscriptions
- `GET /:subscriptionId` – Get a subscription detail
- `POST /:subscriptionId/cancel` – Cancel at period end
- `POST /:subscriptionId/resume` – Resume a canceled subscription (if supported)

### Payments
- `GET /:subscriptionId/payments` – List payments/invoices
- `GET /payments/:paymentId` – Payment detail

### Webhooks
- `POST /webhook/stripe` – Stripe webhook receiver (no auth; signature verified)

## Workflows

### 1) Create a Plan (Admin)
1. Admin calls `POST /plans` with name, price_cents, currency, interval
2. Backend creates Stripe Product/Price and stores `stripe_price_id`

### 2) Subscribe a User
1. Authenticated user calls `POST /` with `planId`
2. Backend creates a Stripe Checkout Session or Payment Intent
3. On success, `subscriptions` row is created/updated
4. User gains gated access (e.g., to a community)

### 3) Renewals
- Stripe handles renewals automatically based on the plan interval
- Webhooks update local `subscriptions` and `subscription_payments`

### 4) Cancel
- User calls `POST /:subscriptionId/cancel` to set `cancel_at_period_end=true`
- Webhooks finalize status at the end of the billing period

## Webhooks

Stripe sends events that the backend verifies and processes. Typical events:

- `invoice.payment_succeeded` – mark payment as `paid`, extend subscription period
- `invoice.payment_failed` – record failed payment, notify user
- `customer.subscription.updated` – update status (active, past_due, canceled)
- `customer.subscription.deleted` – set subscription as canceled/ended

Signature verification:

- Extract `Stripe-Signature` header
- Verify with `STRIPE_WEBHOOK_SECRET`
- Parse and route by event type
