const { Pool } = require("pg");
require("dotenv").config();

const requiredDatabaseEnvironment = [
  "DB_USER",
  "DB_HOST",
  "DB_NAME",
  "DB_PASSWORD",
  "DB_PORT",
];
const missingDatabaseEnvironment = requiredDatabaseEnvironment.filter(
  (name) => !process.env[name],
);

if (missingDatabaseEnvironment.length > 0) {
  throw new Error(
    `Missing required database environment variables: ${missingDatabaseEnvironment.join(", ")}`,
  );
}

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("connect", () => {
  console.log("Connected to PostgreSQL.");
});

pool.on("error", (err) => {
  console.error("Unexpected database error:", err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  connect: () => pool.connect(),
};
