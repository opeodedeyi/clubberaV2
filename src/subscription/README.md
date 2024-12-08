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
