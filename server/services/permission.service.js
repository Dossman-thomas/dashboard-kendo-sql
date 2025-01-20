// Desc: Service functions for managing permissions in the database (CRUD operations)

// project modules
import { pool } from "../config/index.js"; // database connection pool

// Valid columns for permissions table
const validColumns = [
  "canCreate",
  "canRead",
  "canUpdate",
  "canDelete",
  "createdAt",
  "updatedAt",
];

// Check current permissions for a specific user service
export const getPermissionsForUserService = async (userId) => {
  try {
    // Log the user ID received to the console for debugging
    console.log(`Received user ID: ${userId}`);

    // Fetch the user's role from the database using the user ID and execute the query
    const userQuery = "SELECT role FROM users WHERE id = $1";
    const userResult = await pool.query(userQuery, [userId]);

    // If no user is found with the specified ID, throw an error
    if (userResult.rowCount === 0) {
      throw new Error(`User with ID "${userId}" not found`);
    }

    // Get the user's role from the query result
    const userRole = userResult.rows[0].role;

    // Fetch permissions for the user's role from the database and execute the query
    const permissionsQuery = "SELECT * FROM permissions WHERE role = $1";
    const permissionsResult = await pool.query(permissionsQuery, [userRole]);

    // If no permissions are found for the user's role, throw an error
    if (permissionsResult.rowCount === 0) {
      throw new Error(`Permissions for role "${userRole}" not found`);
    }

    // Return the permissions for the user's role
    return permissionsResult.rows[0];
  } catch (error) {
    // If an error occurs, throw an error with a descriptive message
    throw new Error(
      `Error fetching permissions for user, error: ${error.message}`
    );
  }
};

// Retrieve all permissions from the database service
export const getAllPermissionsService = async () => {
  try {
    // Construct the query to fetch all permissions from the database and execute it
    const query = "SELECT * FROM permissions";
    const result = await pool.query(query);

    // Return all permissions from the database
    return result.rows;
  } catch (error) {
    // If an error occurs, throw an error with a descriptive message
    throw new Error(`Error fetching permissions, error: ${error}`);
  }
};

// Get permissions for a specific role service
export const getPermissionsForRoleService = async (role) => {
  try {
    // Log the role received to the console for debugging
    console.log(`getting permissions for role: ${role}`);

    // Fetch permissions for the specified role from the database using a parameterized query
    const query = "SELECT * FROM permissions WHERE role = $1";
    const values = [role];

    // Execute the query
    const result = await pool.query(query, values);

    // Return the permissions for the specified role
    return result.rows[0];
  } catch (error) {
    // If an error occurs, throw an error with a descriptive message
    throw new Error(`Error fetching permissions for role, error: ${error}`);
  }
};

// Update permissions for a specific role
export const updatePermissionsForRoleService = async (
  role,
  updatedPermissions
) => {
  try {
    // Validate the updated permissions object
    const permissionKeys = Object.keys(updatedPermissions).filter((key) =>
      validColumns.includes(key) // Filter out invalid columns
    );
    const permissionValues = permissionKeys.map(
      (key) => updatedPermissions[key]
    ); // Extract values from the updated permissions object

    // If no valid permissions are found, throw an error
    if (permissionKeys.length === 0) {
      throw new Error("No valid permissions to update");
    }

    // Construct the dynamic SET clause with quoted column names
    let setClause = "";
    permissionKeys.forEach((key, index) => {
      setClause += `"${key}" = $${index + 1}`;
      if (index < permissionKeys.length - 1) setClause += ", ";
    });

    // Construct the query to update permissions for the specified role
    const query = `UPDATE permissions SET ${setClause} WHERE role = $${
      permissionKeys.length + 1
    }`;
    const values = [...permissionValues, role]; // Combine permission values and role into an array

    // Execute the query to update permissions for the specified role
    const updateResult = await pool.query(query, values);

    // If no permissions are updated, throw an error
    if (updateResult.rowCount === 0) {
      throw new Error(`Permissions for role "${role}" not found`);
    }

    // After update, return the updated permissions
    return await getPermissionsForRoleService(role);
  } catch (error) {
    // If an error occurs, throw an error with a descriptive message
    throw new Error(
      `Error updating permissions for role, error: ${error.message}`
    );
  }
};
