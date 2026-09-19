require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const logger = require("./utils/logger");
const errorHandler = require("./middleware/errorHandler");
const { apiLimiter } = require("./middleware/rateLimiter");

const userRoutes = require("./routes/userRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const goalRoutes = require("./routes/goalRoutes");
const insightRoutes = require("./routes/insightRoutes");
const importRoutes = require("./routes/importRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// --------------- Middleware ---------------
app.use(cors());
app.use(express.json());
app.use(apiLimiter);

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

// Serve the client (frontend) as static files
app.use(express.static(path.join(__dirname, "..", "client")));

// --------------- API Routes ---------------
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "F1 AI Personal Finance Coach API is running",
    uptime: process.uptime()
  });
});

app.use("/api/users", userRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/insights", insightRoutes);
app.use("/api/import", importRoutes);

// Serve client index.html for any non-API route (SPA fallback)
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "index.html"));
});

// --------------- Error handling ---------------
app.use(errorHandler);

// --------------- Start ---------------
connectDB().then(() => {
  app.listen(PORT, () => {
    logger.info(`Server running at http://localhost:${PORT}`);
    logger.info(`Client served from ${path.join(__dirname, "..", "client")}`);
  });
});
