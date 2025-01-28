import { pool } from '../config/index.js';

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
export const decreaseStockService = async (productId, quantity) => {
    try {
      const query = `CALL decrease_stock($1, $2)`;
      await executeQuery(query, [productId, quantity]);
    } catch (error) {
      console.error(`Error in decreaseStock: ${error.message}`);
      throw error;
    }
  };

// INCREASE STOCK QUANTITY (increase_stock)
export const increaseStockService = async (productId, quantity) => {
    try {
      const query = `CALL increase_stock($1, $2)`;
      await executeQuery(query, [productId, quantity]);
    } catch (error) {
      console.error(`Error in increaseStock: ${error.message}`);
      throw error;
    }
  };

// LOG SALE (log_sale)
export const logSaleService = async (productId, quantitySold) => {
    try {
      const query = `CALL log_sale($1, $2)`;
      await executeQuery(query, [productId, quantitySold]);
    } catch (error) {
      console.error(`Error in logSale: ${error.message}`);
      throw error;
    }
  };

// LOG RESTOCK (log_restock)
export const logRestockService = async (productId, quantityAdded) => {
    try {
      const query = `CALL log_restock($1, $2)`;
      await executeQuery(query, [productId, quantityAdded]);
    } catch (error) {
      console.error(`Error in logRestock: ${error.message}`);
      throw error;
    }
  };

// PREVENT NEGATIVE STOCK TRIGGER
export const testPreventNegativeStockService = async (productId, invalidQuantity) => {
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
  export const testAuditStockChangesService = async (productId, changeType, quantity) => {
    try {
      // Perform a stock operation (either increase or decrease)
      if (changeType === 'Increase') {
        await increaseStockService(productId, quantity);
      } else if (changeType === 'Decrease') {
        await decreaseStockService(productId, quantity);
      } else {
        throw new Error('Invalid changeType. Must be "Increase" or "Decrease".');
      }
    } catch (error) {
      console.error(`Error in testAuditStockChanges: ${error.message}`);
      throw error;
    }
  };
