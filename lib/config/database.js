const path = require("path");
// This path now correctly points to the root .env.local file
require("dotenv").config({ path: path.resolve(__dirname, "../../.env.local") });

const { Sequelize } = require("sequelize");

if (!process.env.DB_HOST) {
  console.warn(
    "Database environment variables not set. Database features will be disabled."
  );
  // Export a dummy object if no credentials
  module.exports = {
    sequelize: {
      authenticate: () => Promise.reject(new Error("Database config missing.")),
    },
  };
} else {
  const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: "postgres",
      logging: false, // Set to true for debugging
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    }
  );

  module.exports = { sequelize };
}
