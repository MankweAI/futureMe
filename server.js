// Load environment variables from .env.local
require("dotenv").config({ path: ".env.local" });

const express = require("express");
const cors = require("cors");

// --- THE FIX ---
// Import the REAL webhook handler from the api/ folder
const webhookHandler = require("./api/webhook.js");

const app = express();
const port = process.env.PORT || 3000;

// Setup middleware
app.use(cors());
app.use(express.json()); // Use Express's built-in JSON parser

// --- THE FIX ---
// Route all requests for /api/webhook to our serverless function handler
// This ensures the logic in `api/webhook.js` is what actually runs.
app.all("/api/webhook", webhookHandler);

// Add a simple root route to confirm the server is running
app.get("/", (req, res) => {
  res.send("FutureMe Backend is running. Send POST requests to /api/webhook.");
});

// Start the server
app.listen(port, () => {
  console.log(`🚀 FutureMe server listening at http://localhost:${port}`);
});
