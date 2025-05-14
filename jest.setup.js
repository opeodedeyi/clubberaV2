// jest.setup.js

process.env.JWT_SECRET = "test-jwt-secret";
process.env.FRONTEND_URL = "http://localhost:4000";

// Setup environment variables for testing
process.env.STRIPE_SECRET_KEY = "sk_test_dummy_key";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_dummy_secret";

// In jest.setup.js
jest.mock("express", () => {
    const mockRouter = {
        post: jest.fn().mockReturnThis(),
        get: jest.fn().mockReturnThis(),
        put: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
    };

    return {
        Router: jest.fn(() => mockRouter),
        json: jest.fn(),
        urlencoded: jest.fn(),
        raw: jest.fn(),
    };
});

jest.mock("express-validator", () => {
    const chainableMock = () => {
        const obj = {};
        // Add ALL possible validator methods
        const methods = [
            "isInt",
            "isFloat",
            "withMessage",
            "optional",
            "trim",
            "notEmpty",
            "isLength",
            "isUppercase",
            "isEmail",
            "isIn",
            "matches",
            "custom",
            "isBoolean",
            "normalizeEmail",
            "isString",
            "exists",
            "not",
            "isArray",
            "isDate",
            "isJSON",
            "isUUID",
            "isURL",
            "isAlpha",
            "isAlphanumeric",
            "isNumeric",
            "isDecimal",
            "isHexadecimal",
            "isIP",
            "isMobilePhone",
        ];

        methods.forEach((method) => {
            obj[method] = jest.fn().mockReturnValue(obj);
        });

        return obj;
    };

    return {
        body: chainableMock,
        param: chainableMock,
        query: chainableMock,
        validationResult: jest.fn(() => ({
            isEmpty: jest.fn().mockReturnValue(true),
            array: jest.fn().mockReturnValue([]),
        })),
    };
});

// Mock stripe module globally
jest.mock("stripe", () => {
    return jest.fn(() => ({
        webhooks: {
            constructEvent: jest.fn().mockReturnValue({
                type: "test_event",
                data: { object: {} },
            }),
        },
        customers: {
            create: jest.fn().mockResolvedValue({ id: "cus_test123" }),
            update: jest.fn().mockResolvedValue({}),
            list: jest.fn().mockResolvedValue({ data: [] }),
        },
        paymentMethods: {
            attach: jest.fn().mockResolvedValue({}),
        },
        products: {
            create: jest.fn().mockResolvedValue({ id: "prod_test123" }),
            list: jest.fn().mockResolvedValue({ data: [] }),
        },
        prices: {
            create: jest.fn().mockResolvedValue({ id: "price_test123" }),
            list: jest.fn().mockResolvedValue({ data: [] }),
        },
        subscriptions: {
            create: jest.fn().mockResolvedValue({
                id: "sub_test123",
                status: "active",
                current_period_end:
                    Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
                latest_invoice: {
                    payment_intent: {
                        id: "pi_test123",
                    },
                },
            }),
            update: jest.fn().mockResolvedValue({
                id: "sub_test123",
                cancel_at_period_end: true,
            }),
            cancel: jest.fn().mockResolvedValue({
                id: "sub_test123",
                status: "canceled",
            }),
        },
    }));
});

// Mock authentication middleware
jest.mock(
    "./src/middleware/auth",
    () => ({
        authenticate: jest.fn((req, res, next) => next()),
    }),
    { virtual: true }
);

// Mock email verification middleware
jest.mock(
    "./src/middleware/verifyEmail",
    () => ({
        verifyEmail: jest.fn((req, res, next) => next()),
    }),
    { virtual: true }
);

// Silence console.error during tests
console.error = jest.fn();
