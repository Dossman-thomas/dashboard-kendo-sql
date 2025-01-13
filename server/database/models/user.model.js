import bcrypt from 'bcrypt';
import pool from '../../config/db.config.js'; // Importing the pool from db.config.js for PostgreSQL connection

export const UserModel = {
  tableName: 'users', // Table name in the PostgreSQL database

  // Method to hash password before saving
  async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  },

  // Method to compare passwords
  async verifyPassword(storedPassword, inputPassword) {
    return await bcrypt.compare(inputPassword, storedPassword);
  },

  // Hooks for user creation and update (before create and update)
  async beforeCreate(user) {
    user.password = await this.hashPassword(user.password);
  },

  async beforeUpdate(user) {
    if (user.changed('password')) {
      user.password = await this.hashPassword(user.password);
    }
  },

};
