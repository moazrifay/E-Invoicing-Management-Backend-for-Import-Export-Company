// models/userModel.js
const { response } = require('express');
const db = require('../config/db');

// 1. Find a user by email.
const findUserByEmail = async (email) => {
  const query = `SELECT * FROM users WHERE email = $1;`;
  const { rows } = await db.query(query, [email]);
  return rows[0];
};

// 2. Find a user by tax ID for tax-ID login.
const findUserByTaxId = async (taxId) => {
  const query = `SELECT * FROM users WHERE tax_id = $1;`;
  const { rows } = await db.query(query, [taxId]);
  return rows[0];
};

// 3. Create a user in the users table.
const createUser = async ({ fullName, email, taxId, hashedPassword }) => {
  const query = `
    INSERT INTO users (full_name, email, tax_id, password_hash)
    VALUES ($1, $2, $3, $4)
    RETURNING id, full_name, email, tax_id, created_at;
  `;
  const values = [fullName, email, taxId, hashedPassword];
  const { rows } = await db.query(query, values);
  return rows[0];
};

module.exports = {
  findUserByEmail,
  findUserByTaxId,
  createUser
};