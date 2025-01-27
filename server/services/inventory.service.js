import { pool } from '../config/db.config.js';

// Utility function for query execution
const executeQuery = async (query, params = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(query, params);
    return result.rows; // Return rows for SELECT or nothing for CALL
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

// DECREASE STOCK QUANTITY (decrease_stock)
export const decreaseStock = async (productId, quantity) => {
  try {
    const query = `CALL decrease_stock($1, $2)`;
    await executeQuery(query, [productId, quantity]);

    // Verify stock was updated
    const verifyQuery = `SELECT stock_quantity FROM products WHERE product_id = $1`;
    const result = await executeQuery(verifyQuery, [productId]);
    return result[0]; // Return the updated stock_quantity for confirmation
  } catch (error) {
    console.error(`Error in decreaseStock: ${error.message}`);
    throw error;
  }
};

// INCREASE STOCK QUANTITY (increase_stock)
export const increaseStock = async (productId, quantity) => {
  try {
    const query = `CALL increase_stock($1, $2)`;
    await executeQuery(query, [productId, quantity]);

    // Verify stock was updated
    const verifyQuery = `SELECT stock_quantity FROM products WHERE product_id = $1`;
    const result = await executeQuery(verifyQuery, [productId]);
    return result[0]; // Return the updated stock_quantity for confirmation
  } catch (error) {
    console.error(`Error in increaseStock: ${error.message}`);
    throw error;
  }
};

// LOG SALE (log_sale)
export const logSale = async (productId, quantitySold) => {
  try {
    const query = `CALL log_sale($1, $2)`;
    await executeQuery(query, [productId, quantitySold]);

    // Verify the sale was logged
    const verifyQuery = `SELECT * FROM sales WHERE product_id = $1 ORDER BY sale_date DESC LIMIT 1`;
    const result = await executeQuery(verifyQuery, [productId]);
    return result[0]; // Return the latest sale record for confirmation
  } catch (error) {
    console.error(`Error in logSale: ${error.message}`);
    throw error;
  }
};

// LOG RESTOCK (log_restock)
export const logRestock = async (productId, quantityAdded) => {
  try {
    const query = `CALL log_restock($1, $2)`;
    await executeQuery(query, [productId, quantityAdded]);

    // Verify the restock was logged
    const verifyQuery = `SELECT * FROM restocks WHERE product_id = $1 ORDER BY restock_date DESC LIMIT 1`;
    const result = await executeQuery(verifyQuery, [productId]);
    return result[0]; // Return the latest restock record for confirmation
  } catch (error) {
    console.error(`Error in logRestock: ${error.message}`);
    throw error;
  }
};

// PREVENT NEGATIVE STOCK TRIGGER
export const testPreventNegativeStock = async (productId, invalidQuantity) => {
  try {
    // Attempt to decrease stock below zero to trigger the error
    const query = `CALL decrease_stock($1, $2)`;
    await executeQuery(query, [productId, invalidQuantity]);
    throw new Error('Trigger did not work: stock went negative!'); // Shouldn't reach here
  } catch (error) {
    if (error.message.includes('violates check constraint')) {
      console.log('Trigger worked as expected: Prevented negative stock.');
    } else {
      console.error(`Unexpected error in testPreventNegativeStock: ${error.message}`);
      throw error;
    }
  }
};

// AUDIT STOCK CHANGES TRIGGER
export const testAuditStockChanges = async (productId, changeType, quantity) => {
  try {
    // Perform a stock operation (either increase or decrease)
    if (changeType === 'Increase') {
      await increaseStock(productId, quantity);
    } else if (changeType === 'Decrease') {
      await decreaseStock(productId, quantity);
    } else {
      throw new Error('Invalid changeType. Must be "Increase" or "Decrease".');
    }

    // Verify the audit log was updated
    const verifyQuery = `SELECT * FROM audit_log WHERE product_id = $1 ORDER BY change_date DESC LIMIT 1`;
    const result = await executeQuery(verifyQuery, [productId]);

    // Return the latest audit log entry
    if (result.length > 0 && result[0].change_type === changeType) {
      console.log('Audit trigger worked as expected:', result[0]);
      return result[0];
    } else {
      throw new Error('Audit trigger failed: No matching log entry found.');
    }
  } catch (error) {
    console.error(`Error in testAuditStockChanges: ${error.message}`);
    throw error;
  }
};
