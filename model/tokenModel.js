const db = require('../config/db');

// 1. Save a new refresh token.
const saveRefreshToken = async (userId, token, expiresAt) => {
  const query = `
    INSERT INTO refresh_tokens (user_id, token, expires_at)
    VALUES ($1, $2, $3);
  `;
  await db.query(query, [userId, token, expiresAt]);
};

// 2. Find a refresh token in the database and verify that it is registered.
const findRefreshToken = async (token) => {
  const query = `
    SELECT * FROM refresh_tokens 
    WHERE token = $1 AND expires_at > NOW();
  `;
  const { rows } = await db.query(query, [token]);
  return rows[0];
};

// 3. Delete a refresh token during logout or replacement.
const deleteRefreshToken = async (token) => {
  const query = `DELETE FROM refresh_tokens WHERE token = $1;`;
  await db.query(query, [token]);
};

// 4. Delete all refresh tokens for a user during global logout.
const deleteAllUserRefreshTokens = async (userId) => {
  const query = `DELETE FROM refresh_tokens WHERE user_id = $1;`;
  await db.query(query, [userId]);
};

module.exports = {
  saveRefreshToken,
  findRefreshToken,
  deleteRefreshToken,
  deleteAllUserRefreshTokens
};