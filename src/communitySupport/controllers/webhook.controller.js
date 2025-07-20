// src/communitySupport/controllers/webhook.controller.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const paymentService = require("../../services/payment.service");
const supportSubscriptionModel = require("../models/supportSubscription.model");
const ApiError = require("../../utils/ApiError");

class WebhookController {
    async handleStripeWebhook(req, res, next) {
        try {
            const sig = req.headers["stripe-signature"];
            let event;

            // Verify webhook signature
            try {
                event = stripe.webhooks.constructEvent(
                    req.rawBody, // Note: Express needs to be configured to provide the raw body
                    sig,
                    process.env.STRIPE_WEBHOOK_SECRET
                );
            } catch (err) {
                console.error(
                    `Webhook signature verification failed: ${err.message}`
                );
                return res
                    .status(400)
                    .json({ status: "error", message: err.message });
            }

            // Process the event
            const result = await paymentService.handleStripeWebhook(event);

            // Handle specific events that require database updates
            switch (event.type) {
                case "invoice.payment_succeeded":
                    await this.handleInvoicePaymentSucceeded(event.data.object);
                    break;

                case "invoice.payment_failed":
                    await this.handleInvoicePaymentFailed(event.data.object);
                    break;

                case "customer.subscription.deleted":
                    await this.handleSubscriptionDeleted(event.data.object);
                    break;

                case "customer.subscription.updated":
                    await this.handleSubscriptionUpdated(event.data.object);
                    break;
            }

            // Return success
            res.status(200).json({ received: true, result });
        } catch (error) {
            console.error("Webhook error:", error);
            res.status(500).json({
                status: "error",
                message: "Webhook processing failed",
            });
        }
    }

    async handleInvoicePaymentSucceeded(invoice) {
        try {
            // Get subscription ID from invoice
            const stripeSubscriptionId = invoice.subscription;
            if (!stripeSubscriptionId) return;

            // Find subscription in database by provider subscription ID
            const subscription =
                await supportSubscriptionModel.findByProviderSubscriptionId(
                    "stripe",
                    stripeSubscriptionId
                );

            if (!subscription) {
                console.log(
                    `No subscription found for Stripe subscription ID: ${stripeSubscriptionId}`
                );
                return;
            }

            // Update subscription status if needed
            if (subscription.status !== "active") {
                await supportSubscriptionModel.updateSubscription(
                    subscription.id,
                    {
                        status: "active",
                    }
                );
            }

            // Record payment
            const paymentData = {
                supportId: subscription.id,
                amount: invoice.amount_paid / 100, // Convert from cents
                currency: invoice.currency,
                paymentMethod: invoice.payment_intent ? "card" : "unknown",
                paymentProvider: "stripe",
                providerTransactionId: invoice.payment_intent || invoice.id,
                status: "succeeded",
                billingPeriodStart: new Date(invoice.period_start * 1000),
                billingPeriodEnd: new Date(invoice.period_end * 1000),
            };

            await supportSubscriptionModel.recordPayment(paymentData);

            console.log(`Payment recorded for subscription ${subscription.id}`);
        } catch (error) {
            console.error("Error handling payment succeeded webhook:", error);
        }
    }

    async handleInvoicePaymentFailed(invoice) {
        try {
            // Get subscription ID from invoice
            const stripeSubscriptionId = invoice.subscription;
            if (!stripeSubscriptionId) return;

            // Find subscription in database by provider subscription ID
            const subscription =
                await supportSubscriptionModel.findByProviderSubscriptionId(
                    "stripe",
                    stripeSubscriptionId
                );

            if (!subscription) {
                console.log(
                    `No subscription found for Stripe subscription ID: ${stripeSubscriptionId}`
                );
                return;
            }

            // Update subscription status
            await supportSubscriptionModel.updateSubscription(subscription.id, {
                status: "past_due",
            });

            // Record failed payment
            const paymentData = {
                supportId: subscription.id,
                amount: invoice.amount_due / 100, // Convert from cents
                currency: invoice.currency,
                paymentMethod: invoice.payment_intent ? "card" : "unknown",
                paymentProvider: "stripe",
                providerTransactionId: invoice.payment_intent || invoice.id,
                status: "failed",
                billingPeriodStart: new Date(invoice.period_start * 1000),
                billingPeriodEnd: new Date(invoice.period_end * 1000),
            };

            await supportSubscriptionModel.recordPayment(paymentData);

            console.log(
                `Failed payment recorded for subscription ${subscription.id}`
            );
        } catch (error) {
            console.error("Error handling payment failed webhook:", error);
        }
    }

    async handleSubscriptionDeleted(subscription) {
        try {
            // Find subscription in database by provider subscription ID
            const dbSubscription =
                await supportSubscriptionModel.findByProviderSubscriptionId(
                    "stripe",
                    subscription.id
                );

            if (!dbSubscription) {
                console.log(
                    `No subscription found for Stripe subscription ID: ${subscription.id}`
                );
                return;
            }

            // Update subscription status
            await supportSubscriptionModel.updateSubscription(
                dbSubscription.id,
                {
                    status: "canceled",
                    canceled_at: new Date(),
                }
            );

            console.log(`Subscription ${dbSubscription.id} marked as canceled`);
        } catch (error) {
            console.error(
                "Error handling subscription deleted webhook:",
                error
            );
        }
    }

    async handleSubscriptionUpdated(subscription) {
        try {
            // Find subscription in database by provider subscription ID
            const dbSubscription =
                await supportSubscriptionModel.findByProviderSubscriptionId(
                    "stripe",
                    subscription.id
                );

            if (!dbSubscription) {
                console.log(
                    `No subscription found for Stripe subscription ID: ${subscription.id}`
                );
                return;
            }

            // Prepare update data
            const updateData = {
                status: subscription.status,
                current_period_start: new Date(
                    subscription.current_period_start * 1000
                ),
                current_period_end: new Date(
                    subscription.current_period_end * 1000
                ),
            };

            // Update cancel_at_period_end if it changed
            if (
                subscription.cancel_at_period_end !==
                dbSubscription.cancel_at_period_end
            ) {
                updateData.cancel_at_period_end =
                    subscription.cancel_at_period_end;

                if (
                    subscription.cancel_at_period_end &&
                    !dbSubscription.canceled_at
                ) {
                    updateData.canceled_at = new Date();
                }
            }

            // Update subscription
            await supportSubscriptionModel.updateSubscription(
                dbSubscription.id,
                updateData
            );

            console.log(`Subscription ${dbSubscription.id} updated`);
        } catch (error) {
            console.error(
                "Error handling subscription updated webhook:",
                error
            );
        }
    }
}

module.exports = new WebhookController();
