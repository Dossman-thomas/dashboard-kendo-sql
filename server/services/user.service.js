// Desc: User service module for handling user CRUD operations and user-related logic

// third-party library modules
import bcrypt from "bcrypt"; // For hashing passwords
import { v4 as uuidv4 } from "uuid"; // For generating UUIDs

// project modules
import { pool } from "../config/index.js"; // Database connection pool

// Operator mapping for dynamic filtering
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

// Build the ORDER BY clause for sorting
const buildOrderClause = (sorts) => {
  return sorts && sorts.length > 0
    ? sorts
        .map((sort) => {
          const sortField = sort.dir ? sort.field : "createdAt";
          const sortDir = sort.dir ? sort.dir.toUpperCase() : "DESC";
          return `"${sortField}" ${sortDir}`;
        })
        .join(", ")
    : `"createdAt" DESC`;
};

// Build the WHERE clause for filtering
const buildWhereClause = (filters, searchQuery) => {
  // Mapping for operators
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

        // Return the filter condition
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
  return filterConditions.length
    ? `WHERE ${filterConditions.join(" AND ")}`
    : "";
};

// Create a new user with hashed password service
export const createUserService = async (userDetails) => {
  try {
    // Destructure user details
    const { name, email, password, role } = userDetails;

    const id = uuidv4(); // Generate a new UUID for the user
    const hashedPassword = await bcrypt.hash(password, 10); // Hash the password

    // Insert the new user into the database using a parameterized query
    const query = `
      INSERT INTO users ("id", "name", "email", "password", "role", "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *;
    `;

    // Execute the query with the user details
    const values = [id, name, email, hashedPassword, role];
    const result = await pool.query(query, values);

    // Return the newly created user
    return result.rows[0];
  } catch (error) {
    // Throw an error if something goes wrong
    throw new Error(`Error creating user, error: ${error.message}`);
  }
};

// Get a user by ID service
export const getUserByIdService = async (id) => {
  try {
    // console log the id received for debugging
    console.log("Fetching user by ID:", id);

    // Get the user by ID using a parameterized query
    const query = "SELECT * FROM users WHERE id = $1";
    const values = [id];
    const result = await pool.query(query, values);

    // Throw an error if no user is found
    if (result.rows.length === 0) {
      throw new Error("User not found");
    }

    // Return the found user object
    return result.rows[0];
  } catch (error) {
    // Throw an error if something goes wrong
    throw new Error(error.message);
  }
};

// Get all users with pagination, sorting, filtering, and search service
export const getAllUsersService = async ({
  page,
  limit,
  sorts,
  filters,
  searchQuery = "",
}) => {
  try {
    // Log the parameters received for debugging
    console.log("Parameters received:", {
      page,
      limit,
      sorts,
      filters,
      searchQuery,
    });

    // Construct the ORDER BY clause for sorting
    const order = buildOrderClause(sorts);
    // Construct the WHERE clause for filters
    const whereClause = buildWhereClause(filters, searchQuery);

    // Log the generated clauses for debugging
    console.log("Order clause:", order);
    console.log("Where clause:", whereClause);

    // Calculate the OFFSET and LIMIT for pagination
    const offset = (page - 1) * limit || 0;
    const paginatedLimit = limit || 10;

    // Log the pagination values for debugging
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

    // Count query for total records
    const countQuery = `
      SELECT COUNT(*)
      FROM "users"
      ${whereClause};
    `;

    // Log the generated queries for debugging
    console.log("Generated query:", query);
    console.log("Generated count query:", countQuery);

    // Execute queries using a connection from the pool
    const client = await pool.connect();
    try {
      // Execute both queries in parallel
      const [usersResult, countResult] = await Promise.all([
        client.query(query),
        client.query(countQuery),
      ]);

      // Parse the total count from the count query result
      const userCount = parseInt(countResult.rows[0].count, 10);

      // Return the paginated users and total count
      return {
        rows: usersResult.rows,
        count: userCount,
      };
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (error) {
    // Log and throw any errors that occur
    console.error("Error in getAllUsersService:", error);
    throw new Error("Failed to fetch users");
  }
};

// Update a user by ID service
export const updateUserService = async (id, updatedData) => {
  // Destructure updated data
  const { name, email, password, role } = updatedData;
  // Hash the password if provided with the update
  const hashedPassword = password ? await bcrypt.hash(password, 10) : null; 

  try {
    // log the id and updated data for debugging
    console.log("Updating user with ID:", id, "and data:", updatedData);

    // log id received for debugging
    console.log("Updating user by ID:", id);

    // Update the user using a parameterized query
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

    // Execute the query with the updated data
    const values = [name, email, hashedPassword, role, id];
    const result = await pool.query(query, values);

    // Throw an error if no user is found
    if (result.rows.length === 0) {
      throw new Error("User not found");
    }

    // Return the updated user object
    return result.rows[0];
  } catch (error) {
    // Throw an error if something goes wrong
    throw new Error(`Error updating user, error: ${error.message}`);
  }
};

// Delete a user by ID service
export const deleteUserService = async (id) => {
  try {
    // log id received for debugging
    console.log("Deleting user by ID:", id);

    // call delete_user stored procedure with the user ID as a parameter
    const query = "CALL delete_user($1)";
    const values = [id];

    // execute the query
    await pool.query(query, values);

    // return success message if the user is deleted
    return { message: "User deleted successfully" };
  } catch (error) {
    // throw an error if something goes wrong
    throw new Error(error.message);
  }
};

// Check email availability
export const checkEmailAvailabilityService = async (email, currentUserId) => {
  try {
    // console.log the email and currentUserId for debugging
    console.log("Checking email availability for:", email, "with user Id:", currentUserId);

    // Check if the email is available using a parameterized query
    const query = `
      SELECT id FROM users
      WHERE email = $1 AND id != $2; 
    `; // Exclude current user if updating

    // Execute the query with the email and currentUserId
    const values = [email, currentUserId || null];
    const result = await pool.query(query, values);
    
    // Return true if no rows are returned (email is available)
    return result.rows.length === 0;
  } catch (error) {
    // Throw an error if something goes wrong
    throw new Error(error.message);
  }
};

// Check if provided password matches user's current password
export const passwordCheckService = async (userId, currentPassword) => {
  try {
    // Log the userId for debugging
    console.log("Checking password for user ID:", userId);

    // Get the user's password using a parameterized query
    const query = "SELECT password FROM users WHERE id = $1";
    const values = [userId];
    const result = await pool.query(query, values);

    // Throw an error if no user is found
    if (result.rows.length === 0) {
      throw new Error("User not found");
    }

    // Compare the provided password with the hashed password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      result.rows[0].password
    );

    // Return true if the password is valid
    return isPasswordValid;
  } catch (error) {
    // Throw an error if something goes wrong
    throw new Error(error.message);
  }
};

// Get user statistics (count by role)
export const userStatCheckService = async () => {
  try {
    // Fetch user statistics using a query using aggregate function COUNT
    const query = `
      SELECT role, COUNT(*) AS count
      FROM users
      GROUP BY role;
    `;

    // Execute the query and parse the result
    const result = await pool.query(query);
    const counts = {}; // Initialize an empty object for counts

    // Loop through the result and add counts to the object
    result.rows.forEach((row) => {
      counts[`${row.role.replace(" ", "")}Count`] = parseInt(row.count, 10);
    });

    // Return the user statistics
    return counts;
  } catch (error) {
    // Throw an error if something goes wrong
    throw new Error(`Failed to fetch user statistics: ${error.message}`);
  }
};
