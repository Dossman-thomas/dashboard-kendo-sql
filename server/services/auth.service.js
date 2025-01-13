import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../config/index.js";

export const authenticateUserService = async (email, password) => {
  try {
    // Query to fetch the user by email, explicitly including the password
    const query = `
      SELECT id, name, email, role, password 
      FROM users 
      WHERE email = $1
      LIMIT 1;
    `;
    const values = [email];
    const result = await pool.query(query, values);

    // If no user is found, throw an error
    if (result.rows.length === 0) {
      const error = new Error('Invalid credentials. Please check your email and password, then try again.');
      error.status = 404;
      throw error;
    }

    const user = result.rows[0];

    // Compare the provided password with the hashed password stored in the database
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      const error = new Error('Invalid credentials. Please check your email and password, then try again.');
      error.status = 404;
      throw error;
    }

    // Create a user object without the password
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    // Generate a JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Return the user object (without password) and the token
    return { token, user: userResponse };
  } catch (error) {
    throw error;
  }
};
