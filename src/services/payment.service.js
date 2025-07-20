// src/services/payment.service.js
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

class PaymentService {
    async createStripeSubscription(data) {
        const { customerId, paymentMethodId, priceId, metadata = {} } = data;

        try {
            // Attach payment method to customer if provided
            if (paymentMethodId) {
                await stripe.paymentMethods.attach(paymentMethodId, {
                    customer: customerId,
                });

                // Set as default payment method
                await stripe.customers.update(customerId, {
                    invoice_settings: {
                        default_payment_method: paymentMethodId,
                    },
                });
            }

            // Create the subscription
            const subscription = await stripe.subscriptions.create({
                customer: customerId,
                items: [{ price: priceId }],
                expand: ["latest_invoice.payment_intent"],
                metadata,
            });

            return subscription;
        } catch (error) {
            console.error("Stripe subscription creation error:", error);
            throw error;
        }
    }

    async cancelStripeSubscription(subscriptionId, cancelAtPeriodEnd = true) {
        try {
            let subscription;

            if (cancelAtPeriodEnd) {
                // Cancel at period end
                subscription = await stripe.subscriptions.update(
                    subscriptionId,
                    {
                        cancel_at_period_end: true,
                    }
                );
            } else {
                // Cancel immediately
                subscription = await stripe.subscriptions.cancel(
                    subscriptionId
                );
            }

            return subscription;
        } catch (error) {
            console.error("Stripe subscription cancellation error:", error);
            throw error;
        }
    }

    async createStripeCustomer(customerData) {
        const { email, name, metadata = {} } = customerData;

        try {
            const customer = await stripe.customers.create({
                email,
                name,
                metadata,
            });

            return customer;
        } catch (error) {
            console.error("Stripe customer creation error:", error);
            throw error;
        }
    }

    async getOrCreateStripeCustomer(customerData) {
        const { email, name, userId } = customerData;

        try {
            // Search for existing customer
            const customers = await stripe.customers.list({
                email,
                limit: 1,
            });

            if (customers.data.length > 0) {
                return customers.data[0];
            }

            // Create new customer if not found
            return this.createStripeCustomer({
                email,
                name,
                metadata: { userId },
            });
        } catch (error) {
            console.error("Stripe customer fetch/creation error:", error);
            throw error;
        }
    }

    async createStripePrice(priceData) {
        const {
            amount,
            currency = "usd",
            interval = "month",
            productId,
            metadata = {},
        } = priceData;

        try {
            const price = await stripe.prices.create({
                unit_amount: Math.round(amount * 100), // Convert to cents
                currency,
                recurring: { interval },
                product: productId,
                metadata,
            });

            return price;
        } catch (error) {
            console.error("Stripe price creation error:", error);
            throw error;
        }
    }

    async createStripeProduct(productData) {
        const { name, description, metadata = {} } = productData;

        try {
            const product = await stripe.products.create({
                name,
                description,
                metadata,
            });

            return product;
        } catch (error) {
            console.error("Stripe product creation error:", error);
            throw error;
        }
    }

    async getOrCreateStripePlanProducts(planData) {
        const {
            communityId,
            planId,
            planName,
            description,
            amount,
            currency = "usd",
        } = planData;

        try {
            // Create metadata
            const metadata = {
                communityId: communityId.toString(),
                planId: planId.toString(),
            };

            // Look for existing product
            const products = await stripe.products.list({
                limit: 1,
                active: true,
                metadata: {
                    communityId: communityId.toString(),
                    planId: planId.toString(),
                },
            });

            let product;
            let price;

            if (products.data.length > 0) {
                // Use existing product
                product = products.data[0];

                // Get prices for this product
                const prices = await stripe.prices.list({
                    product: product.id,
                    active: true,
                    limit: 1,
                });

                if (prices.data.length > 0) {
                    price = prices.data[0];
                } else {
                    // Create new price if none exists
                    price = await this.createStripePrice({
                        amount,
                        currency,
                        productId: product.id,
                        metadata,
                    });
                }
            } else {
                // Create new product and price
                product = await this.createStripeProduct({
                    name: planName,
                    description,
                    metadata,
                });

                price = await this.createStripePrice({
                    amount,
                    currency,
                    productId: product.id,
                    metadata,
                });
            }

            return { product, price };
        } catch (error) {
            console.error("Stripe plan products error:", error);
            throw error;
        }
    }

    async handleStripeWebhook(event) {
        const eventType = event.type;

        // Handle different event types
        switch (eventType) {
            case "invoice.payment_succeeded":
                return this.handleInvoicePaymentSucceeded(event.data.object);

            case "invoice.payment_failed":
                return this.handleInvoicePaymentFailed(event.data.object);

            case "customer.subscription.deleted":
                return this.handleSubscriptionDeleted(event.data.object);

            case "customer.subscription.updated":
                return this.handleSubscriptionUpdated(event.data.object);

            default:
                console.log(`Unhandled event type ${eventType}`);
                return { status: "ignored", eventType };
        }
    }

    // Method stubs for webhook handlers
    async handleInvoicePaymentSucceeded(invoice) {
        // This would be implemented to update subscription status and record payment
        console.log("Payment succeeded for invoice:", invoice.id);
        return { status: "success", invoiceId: invoice.id };
    }

    async handleInvoicePaymentFailed(invoice) {
        // This would be implemented to update subscription status
        console.log("Payment failed for invoice:", invoice.id);
        return { status: "failed", invoiceId: invoice.id };
    }

    async handleSubscriptionDeleted(subscription) {
        // This would be implemented to update subscription status
        console.log("Subscription deleted:", subscription.id);
        return { status: "deleted", subscriptionId: subscription.id };
    }

    async handleSubscriptionUpdated(subscription) {
        // This would be implemented to update subscription details
        console.log("Subscription updated:", subscription.id);
        return { status: "updated", subscriptionId: subscription.id };
    }
}

module.exports = new PaymentService();
