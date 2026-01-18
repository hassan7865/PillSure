import express from "express";
import dotenv from "dotenv";
import { AuthRoutes } from "./src/routes/auth.route";
import { OnboardingRoutes } from "./src/routes/onboarding.route";
import { DoctorRoute } from "./src/routes/doctor.route";
import { MedicineRoute } from "./src/routes/medicine.route";
import { AppointmentRoute } from "./src/routes/appointment.route";
import { AdminRoute } from "./src/routes/admin.route";
import LiveKitRoute from "./src/routes/livekit.route";
import { RAGRoute } from "./src/routes/rag.route";
import { AuthService } from "./src/services/auth.service";
import { OnboardingService } from "./src/services/onboarding.service";
import { errorHandler, notFound } from "./src/middleware/error.handler";
import { db } from "./src/config/database";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Initialize services and routes
const initializeApp = async () => {
  try {
    console.log("Database connected successfully");

    // Initialize services
    const authService = new AuthService();
    const onboardingService = new OnboardingService();

    // Initialize routes
    const authRoutes = new AuthRoutes(authService);
    const onboardingRoutes = new OnboardingRoutes(onboardingService);
    const doctorRoutes = new DoctorRoute();
    const medicineRoutes = new MedicineRoute();
    const appointmentRoutes = new AppointmentRoute();
    const adminRoutes = new AdminRoute();
    const livekitRoutes = new LiveKitRoute();
    const ragRoutes = new RAGRoute();

    // Mount routes
    app.use("/api/auth", authRoutes.getRouter());
    app.use("/api/onboarding", onboardingRoutes.getRouter());
    app.use("/api/doctor", doctorRoutes.getRouter());
    app.use("/api/medicine", medicineRoutes.getRouter());
    app.use("/api/appointments", appointmentRoutes.getRouter());
    app.use("/api/admin", adminRoutes.getRouter());
    app.use("/api/livekit", livekitRoutes.getRouter());
    app.use("/api/rag", ragRoutes.getRouter());

    // Health check endpoint
    app.get("/health", (req, res) => {
      res.json({ status: "OK", message: "Server is running" });
    });


    app.use(notFound);

    app.use(errorHandler);

  } catch (error) {
    console.error("App initialization failed:", error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  await initializeApp();
  
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
};

// Handle uncaught exceptions - log but don't exit (server continues running)
process.on("uncaughtException", (error: Error) => {
  console.error("Uncaught Exception:", error);
  console.error("Stack:", error.stack);
  console.error("Server will continue running. Please fix the error to prevent issues.");
});

// Handle unhandled promise rejections - log but don't exit (server continues running)
process.on("unhandledRejection", (reason: any, promise: Promise<any>) => {
  console.error("Unhandled Rejection at:", promise);
  console.error("Reason:", reason);
  console.error("Server will continue running. Please fix the error to prevent issues.");
 
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down server...");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down server...");
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  console.error("Failed to start server:", error);
  console.error("Stack:", error instanceof Error ? error.stack : error);
  process.exit(1);
});