import { Router } from 'express';
import {
    decreaseStockController,
    increaseStockController,
    logSaleController,
    logRestockController,
    testPreventNegativeStockController,
    testAuditStockChangesController
} from '../controllers/index.js';

export const inventoryRouter = Router();

// Decrease stock quantity route
inventoryRouter.post('/decrease-stock', decreaseStockController); // endpoint: /api/inventory/decrease-stock

// Increase stock quantity route
inventoryRouter.post('/increase-stock', increaseStockController); // endpoint: /api/inventory/increase-stock

// Log a sale route
inventoryRouter.post('/log-sale', logSaleController); // endpoint: /api/inventory/log-sale

// Log a restock route
inventoryRouter.post('/log-restock', logRestockController); // endpoint: /api/inventory/log-restock

// Test prevent negative stock route
inventoryRouter.post('/test-prevent-negative-stock', testPreventNegativeStockController); // endpoint: /api/inventory/test-prevent-negative-stock

// Test audit stock changes route
inventoryRouter.post('/test-audit-stock-changes', testAuditStockChangesController); // endpoint: /api/inventory/test-audit-stock-changes