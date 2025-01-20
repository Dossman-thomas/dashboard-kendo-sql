// Import the user model
import { UserModel } from "../database/models/user.model.js";
import { pagination } from "../utils/common.util.js";
import { pool } from "../config/index.js";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

// Create a new user
export const createUserService = async (userDetails) => {
  try {
    const { name, email, password, role } = userDetails;
    const id = uuidv4(); // Generate a new UUID for the user

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);

    const query = `
      INSERT INTO users ("id", "name", "email", "password", "role", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *;
    `;

    const values = [id, name, email, hashedPassword, role];

    const result = await pool.query(query, values);

    return result.rows[0];
  } catch (error) {
    throw new Error(`Error creating user, error: ${error.message}`);
  }
};

// Get a user by ID
export const getUserByIdService = async (id) => {
  try {
    const query = "SELECT * FROM users WHERE id = $1";
    const values = [id];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error("User not found");
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
    console.log("Parameters received:", {
      page,
      limit,
      sorts,
      filters,
      searchQuery,
    });

// Handle sorting dynamically with default fallback
const order =
  sorts && sorts.length > 0
    ? sorts
        .map((sort) => {
          const sortField = sort.dir ? sort.field : "createdAt"; // Default to "createdAt" if dir is missing
          const sortDir = sort.dir ? sort.dir.toUpperCase() : "DESC"; // Default to "DESC" if dir is missing
          return `"${sortField}" ${sortDir}`;
        })
        .join(", ")
    : `"createdAt" DESC`; // Default order if no sorts are provided


    console.log("Order clause:", order);

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
          if (
            filter.operator === "contains" ||
            filter.operator === "doesnotcontain"
          ) {
            value = `%${value}%`;
          } else if (filter.operator === "startswith") {
            value = `${value}%`;
          } else if (filter.operator === "endswith") {
            value = `%${value}`;
          }

          return `"${filter.field}" ${operator} '${value}'`;
        })
      : [];

    console.log("Filter conditions:", filterConditions);

    // Add search query condition
    if (searchQuery) {
      filterConditions.push(
        `("name" ILIKE '%${searchQuery}%' OR "email" ILIKE '%${searchQuery}%')`
      );
    }

    // console.log("Search query condition added:", filterConditions);

    // Combine all conditions with AND
    const whereClause = filterConditions.length
      ? `WHERE ${filterConditions.join(" AND ")}`
      : "";

    console.log("Where clause:", whereClause);

    // Pagination
    const offset = (page - 1) * limit || 0;
    const paginatedLimit = limit || 10;

    console.log("Pagination values:", { offset, paginatedLimit });

    // Final query
    const query = `
      SELECT *
      FROM "users"
      ${whereClause}
      ORDER BY ${order}
      LIMIT ${paginatedLimit}
      OFFSET ${offset};
    `;
    console.log("Generated query:", query);

    // Count query for total records
    const countQuery = `
      SELECT COUNT(*)
      FROM "users"
      ${whereClause};
    `;
    console.log("Generated count query:", countQuery);

    // Execute queries
    const client = await pool.connect();
    try {
      const [usersResult, countResult] = await Promise.all([
        client.query(query),
        client.query(countQuery),
      ]);

      const userCount = parseInt(countResult.rows[0].count, 10);

      return {
        rows: usersResult.rows,
        count: userCount,
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
        "updatedAt" = NOW()
      WHERE id = $5
      RETURNING id, name, email, role, "updatedAt";
    `;
    const values = [name, email, hashedPassword, role, id];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error("User not found");
    }

    return result.rows[0];
  } catch (error) {
    throw new Error(`Error updating user, error: ${error.message}`);
  }
};


// Delete a user by ID
export const deleteUserService = async (id) => {
  try {
    // call delete_user stored procedure
    const query = "CALL delete_user($1)";
    const values = [id];

    // execute the query
    const result = await pool.query(query, values);

    // return success message
    return { message: "User deleted successfully" };

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
    const query = "SELECT password FROM users WHERE id = $1";
    const values = [userId];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error("User not found");
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      result.rows[0].password
    );
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
      counts[`${row.role.replace(" ", "")}Count`] = parseInt(row.count, 10);
    });

    return counts;
  } catch (error) {
    throw new Error(`Failed to fetch user statistics: ${error.message}`);
  }
};
