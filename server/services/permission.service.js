import { RolePermissionModel } from '../database/models/index.js';
import { pool } from '../config/index.js';

// Check current permissions for a specific user
export const getPermissionsForUser = async (userId) => {
  try {
    const query = 'SELECT * FROM permissions WHERE user_id = $1';
    const values = [userId];
    const result = await pool.query(query, values);
    return result.rows[0]; // Returning the first matching row (user's permissions)
  } catch (error) {
    throw new Error(`Error fetching permissions for user, error: ${error}`);
  }
};

// Retrieve all permissions
export const getAllPermissionsService = async () => {
  try {
    const query = 'SELECT * FROM permissions';
    const result = await pool.query(query);
    return result.rows; // Return all permissions from the database
  } catch (error) {
    throw new Error(`Error fetching permissions, error: ${error}`);
  }
};

// Get permissions for a specific role
export const getPermissionsForRoleService = async (role) => {
  try {
    const query = 'SELECT * FROM permissions WHERE role = $1';
    const values = [role];
    const result = await pool.query(query, values);
    return result.rows[0]; // Return the permissions for the specified role
  } catch (error) {
    throw new Error(`Error fetching permissions for role, error: ${error}`);
  }
};

// Update permissions for a specific role
export const updatePermissionsForRoleService = async (role, updatedPermissions) => {
  try {
    // Assuming 'updatedPermissions' is an object with key-value pairs to update
    // Constructing a dynamic query for updating the permissions
    const permissionKeys = Object.keys(updatedPermissions);
    const permissionValues = Object.values(updatedPermissions);

    if (permissionKeys.length === 0) {
      throw new Error('No permissions to update');
    }

    let setClause = '';
    permissionKeys.forEach((key, index) => {
      setClause += `${key} = $${index + 1}`;
      if (index < permissionKeys.length - 1) setClause += ', ';
    });

    const query = `UPDATE permissions SET ${setClause} WHERE role = $${permissionKeys.length + 1}`;
    const values = [...permissionValues, role];
    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      throw new Error(`Permissions for role "${role}" not found`);
    }

    // After update, return the updated permissions
    return getPermissionsForRoleService(role);
  } catch (error) {
    throw new Error(`Error updating permissions for role, error: ${error}`);
  }
};
