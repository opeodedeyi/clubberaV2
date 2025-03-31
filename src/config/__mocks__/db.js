// src/config/__mocks__/db.js
const mockDb = {
    query: jest.fn(),
    executeTransaction: jest.fn()
};

module.exports = mockDb;