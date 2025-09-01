import "reflect-metadata";
import express from "express";
import dotenv from "dotenv";
import { DataSource } from "typeorm";
import { User } from "./src/entities/User";
import { Role } from "./src/entities/Role";
import { AuthRoutes } from "./src/routes/auth.route";
import { AuthService } from "./src/services/authservice";
import { errorHandler, notFound } from "./src/middleware/error.handler";
import databaseConfig from "./src/config/database";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Database connection
let dataSource: DataSource;

const initializeDatabase = async () => {
  try {
    dataSource = await databaseConfig.initialize();
    console.log("Database connected successfully");
    
    // Initialize repositories
    const userRepository = dataSource.getRepository(User);
    const roleRepository = dataSource.getRepository(Role);
    
    // Initialize services
    const authService = new AuthService(userRepository, roleRepository);
    
    // Initialize routes
    const authRoutes = new AuthRoutes(authService);
    
    // Mount routes
    app.use("/api/auth", authRoutes.getRouter());
    
    // Health check endpoint
    app.get("/health", (req, res) => {
      res.json({ status: "OK", message: "Server is running" });
    });
    
    // 404 handler
    app.use(notFound);
    
    // Error handler
    app.use(errorHandler);
    
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  await initializeDatabase();
  
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
};

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down server...");
  if (dataSource && dataSource.isInitialized) {
    await dataSource.destroy();
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down server...");
  if (dataSource && dataSource.isInitialized) {
    await dataSource.destroy();
  }
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
