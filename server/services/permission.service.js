import { RolePermissionModel } from '../database/models/index.js';
import { pool } from '../config/index.js';

// Check current permissions for a specific user
export const getPermissionsForUser = async (userId) => {
  try {
    // First, fetch the user's role
    const userQuery = 'SELECT role FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [userId]);

    if (userResult.rowCount === 0) {
      throw new Error(`User with ID "${userId}" not found`);
    }

    const userRole = userResult.rows[0].role;

    // Fetch permissions for the user's role
    const permissionsQuery = 'SELECT * FROM permissions WHERE role = $1';
    const permissionsResult = await pool.query(permissionsQuery, [userRole]);

    if (permissionsResult.rowCount === 0) {
      throw new Error(`Permissions for role "${userRole}" not found`);
    }

    return permissionsResult.rows[0];
  } catch (error) {
    throw new Error(`Error fetching permissions for user, error: ${error.message}`);
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
    // Validate updatedPermissions to match existing columns
    const validColumns = ['canCreate', 'canRead', 'canUpdate', 'canDelete', 'createdAt', 'updatedAt'];
    const permissionKeys = Object.keys(updatedPermissions).filter((key) =>
      validColumns.includes(key)
    );
    const permissionValues = permissionKeys.map((key) => updatedPermissions[key]);

    if (permissionKeys.length === 0) {
      throw new Error('No valid permissions to update');
    }

    // Construct the dynamic SET clause with quoted column names
    let setClause = '';
    permissionKeys.forEach((key, index) => {
      setClause += `"${key}" = $${index + 1}`;
      if (index < permissionKeys.length - 1) setClause += ', ';
    });

    const query = `UPDATE permissions SET ${setClause} WHERE role = $${permissionKeys.length + 1}`;
    const values = [...permissionValues, role];

    const updateResult = await pool.query(query, values);

    if (updateResult.rowCount === 0) {
      throw new Error(`Permissions for role "${role}" not found`);
    }

    // After update, return the updated permissions
    return await getPermissionsForRoleService(role);
  } catch (error) {
    throw new Error(`Error updating permissions for role, error: ${error.message}`);
  }
};

