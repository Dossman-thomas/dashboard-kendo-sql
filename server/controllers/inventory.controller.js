import { messages } from "../messages/index.js";
import { response } from "../utils/index.js";
import {
  decreaseStockService,
  increaseStockService,
  logSaleService,
  logRestockService,
  testPreventNegativeStockService,
  testAuditStockChangesService,
} from "../services/index.js";

// Controller for decreasing stock quantity
export const decreaseStockController = async (req, res) => {
  const { productId, quantity } = req.body;

  try {
    const updatedStock = await decreaseStockService(productId, quantity);
    return response(res, {
      statusCode: 200,
      message: messages.general.SUCCESS,
    });
  } catch (error) {
    console.log(error);
    return response(res, {
      statusCode: 500,
      message: messages.general.INTERNAL_SERVER_ERROR,
    });
  }
};

// Controller for increasing stock quantity
export const increaseStockController = async (req, res) => {
  const { productId, quantity } = req.body;

  try {
    const updatedStock = await increaseStockService(productId, quantity);
    return response(res, {
      statusCode: 200,
      message: messages.general.SUCCESS,
      data: updatedStock,
    });
  } catch (error) {
    console.log(error);
    return response(res, {
      statusCode: 500,
      message: messages.general.INTERNAL_SERVER_ERROR,
    });
  }
};

// Controller for logging a sale
export const logSaleController = async (req, res) => {
  const { productId, quantitySold } = req.body;

  try {
    const saleRecord = await logSaleService(productId, quantitySold);
    return response(res, {
      statusCode: 200,
      message: messages.general.SUCCESS,
      data: saleRecord,
    });
  } catch (error) {
    console.log(error);
    return response(res, {
      statusCode: 500,
      message: messages.general.INTERNAL_SERVER_ERROR,
    });
  }
};

// Controller for logging a restock
export const logRestockController = async (req, res) => {
  const { productId, quantityAdded } = req.body;

  try {
    const restockRecord = await logRestockService(
      productId,
      quantityAdded
    );
    return response(res, {
      statusCode: 200,
      message: messages.general.SUCCESS,
      data: restockRecord,
    });
  } catch (error) {
    console.log(error);
    return response(res, {
      statusCode: 500,
      message: messages.general.INTERNAL_SERVER_ERROR,
    });
  }
};

// Controller for testing the prevent_negative_stock trigger
export const testPreventNegativeStockController = async (req, res) => {
  const { productId, invalidQuantity } = req.body;

  try {
    await testPreventNegativeStockService(productId, invalidQuantity);
    return response(res, {
        statusCode: 200,
        message: messages.general.SUCCESS,
    })
  } catch (error) {
    console.log(error);
    return response(res, {
      statusCode: 500,
      message: messages.general.INTERNAL_SERVER_ERROR,
    });
  }
};

// Controller for testing the audit_stock_changes trigger
export const testAuditStockChangesController = async (req, res) => {
  const { productId, changeType, quantity } = req.body;

  try {
    const auditLog = await testAuditStockChangesService(
      productId,
      changeType,
      quantity
    );
    return response(res, {
      statusCode: 200,
      message: messages.general.SUCCESS,
      data: auditLog,
    });
  } catch (error) {
    console.log(error);
    return response(res, {
      statusCode: 500,
      message: messages.general.INTERNAL_SERVER_ERROR,
    });
  }
};
