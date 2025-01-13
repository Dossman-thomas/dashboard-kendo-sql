// Import the user model
import { UserModel } from "../database/models/user.model.js";
import { pagination } from "../utils/common.util.js";
import { pool } from "../config/index.js"
import bcrypt from "bcrypt";

// Create a new user
export const createUserService = async (userData) => {
  const { name, email, password, role } = userData;
  const hashedPassword = await bcrypt.hash(password, 10); // Hash the password

  try {
    const query = `
      INSERT INTO users (name, email, password, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id, name, email, role, created_at AS "createdAt", updated_at AS "updatedAt";
    `;
    const values = [name, email, hashedPassword, role];
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    throw new Error(error.message);
  }
};

// Get a user by ID
export const getUserByIdService = async (id) => {
  try {
    const query = 'SELECT * FROM users WHERE id = $1';
    const values = [id];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0];
  } catch (error) {
    throw new Error(error.message);
  }
};


// Get all users with pagination, sorting, filtering, and search
export const getAllUsersService = async ({
  page,
  limit,
  sorts,
  filters,
  searchQuery = "",
}) => {
  try {
    // Handle sorting dynamically
    const order =
      sorts && sorts.length > 0
        ? sorts
            .filter((sort) => sort.dir) // Exclude elements where dir is undefined
            .map((sort) => `"${sort.field}" ${sort.dir.toUpperCase()}`)
            .join(", ")
        : `"createdAt" DESC`; // Default order

    // Mapping for operators
    const operatorMapping = {
      contains: "ILIKE",
      doesnotcontain: "NOT ILIKE",
      eq: "=",
      neq: "!=",
      startswith: "ILIKE",
      endswith: "ILIKE",
      greaterThan: ">",
      lessThan: "<",
      greaterThanOrEquals: ">=",
      lessThanOrEquals: "<=",
    };

    // Construct the WHERE clause for filters
    const filterConditions = filters?.length
      ? filters.map((filter) => {
          const operator = operatorMapping[filter.operator] || "=";
          let value = filter.value;

          // Handle special cases for like operators
          if (filter.operator === "contains" || filter.operator === "doesnotcontain") {
            value = `%${value}%`;
          } else if (filter.operator === "startswith") {
            value = `${value}%`;
          } else if (filter.operator === "endswith") {
            value = `%${value}`;
          }

          return `"${filter.field}" ${operator} '${value}'`;
        })
      : [];

    // Add search query condition
    if (searchQuery) {
      filterConditions.push(
        `("name" ILIKE '%${searchQuery}%' OR "email" ILIKE '%${searchQuery}%')`
      );
    }

    // Combine all conditions with AND
    const whereClause = filterConditions.length
      ? `WHERE ${filterConditions.join(" AND ")}`
      : "";

    // Pagination
    const { offset, limit: paginatedLimit } = pagination({ page, limit });

    // Final query
    const query = `
      SELECT *
      FROM "users"
      ${whereClause}
      ORDER BY ${order}
      LIMIT ${paginatedLimit}
      OFFSET ${offset};
    `;

    // Count query for total records
    const countQuery = `
      SELECT COUNT(*)
      FROM "users"
      ${whereClause};
    `;

    // Execute queries
    const client = await pool.connect();
    try {
      const [usersResult, countResult] = await Promise.all([
        client.query(query),
        client.query(countQuery),
      ]);

      return {
        rows: usersResult.rows,
        count: parseInt(countResult.rows[0].count, 10),
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in getAllUsersService:", error);
    throw new Error("Failed to fetch users");
  }
};


// Update a user by ID
export const updateUserService = async (id, updatedData) => {
  const { name, email, password, role } = updatedData;
  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

  try {
    const query = `
      UPDATE users
      SET
        name = COALESCE($1, name),
        email = COALESCE($2, email),
        password = COALESCE($3, password),
        role = COALESCE($4, role),
        updated_at = NOW()
      WHERE id = $5
      RETURNING id, name, email, role, updated_at AS "updatedAt";
    `;
    const values = [name, email, hashedPassword, role, id];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0];
  } catch (error) {
    throw new Error(error.message);
  }
};

// Delete a user by ID
export const deleteUserService = async (id) => {
  try {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const values = [id];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return { message: 'User deleted successfully' };
  } catch (error) {
    throw new Error(error.message);
  }
};

// Check email availability
export const checkEmailAvailabilityService = async (email, currentUserId) => {
  try {
    const query = `
      SELECT id FROM users
      WHERE email = $1 AND id != $2;
    `;
    const values = [email, currentUserId || null];
    const result = await pool.query(query, values);

    return result.rows.length === 0; // Email is available if no rows are returned
  } catch (error) {
    throw new Error(error.message);
  }
};

// Check if provided password matches user's current password
export const passwordCheckService = async (userId, currentPassword) => {
  try {
    const query = 'SELECT password FROM users WHERE id = $1';
    const values = [userId];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, result.rows[0].password);
    return isPasswordValid;
  } catch (error) {
    throw new Error(error.message);
  }
};


// Get user statistics (count by role)
export const userStatCheckService = async () => {
  try {
    const query = `
      SELECT role, COUNT(*) AS count
      FROM users
      GROUP BY role;
    `;
    const result = await pool.query(query);

    const counts = {};
    result.rows.forEach((row) => {
      counts[`${row.role.replace(' ', '')}Count`] = parseInt(row.count, 10);
    });

    return counts;
  } catch (error) {
    throw new Error(`Failed to fetch user statistics: ${error.message}`);
  }
};
