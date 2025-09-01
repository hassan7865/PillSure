import "reflect-metadata";
import { DataSource } from "typeorm";
import { Role } from "../entities/Role";
import { UserRole } from "../core/types";
import databaseConfig from "../config/database";

const roles = [
  {
    name: UserRole.PATIENT,
    description: "Regular patient user with basic access"
  },
  {
    name: UserRole.ADMIN,
    description: "System administrator with full access"
  },
  {
    name: UserRole.DOCTOR,
    description: "Medical professional with patient management access"
  },
  {
    name: UserRole.PHARMACIST,
    description: "Pharmacy staff with medication management access"
  },
  {
    name: UserRole.HOSPITAL,
    description: "Hospital staff with institutional access"
  }
];

async function initializeRoles() {
  let dataSource: DataSource | undefined;

  try {
    // Initialize database connection
    dataSource = await databaseConfig.initialize();
    console.log("Database connected successfully");

    const roleRepository = dataSource.getRepository(Role);

    // Check if roles already exist
    const existingRoles = await roleRepository.find();
    
    if (existingRoles.length > 0) {
      console.log("Roles already exist, skipping initialization");
      console.log("Existing roles:", existingRoles.map(r => r.name));
      return;
    }

    // Create roles
    console.log("Creating initial roles...");
    
    for (const roleData of roles) {
      const role = roleRepository.create({
        name: roleData.name,
        description: roleData.description,
        isActive: true
      });
      
      await roleRepository.save(role);
      console.log(`✓ Created role: ${roleData.name}`);
    }

    console.log("All roles created successfully!");

  } catch (error) {
    console.error("Error initializing roles:", error);
    process.exit(1);
  } finally {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
      console.log("Database connection closed");
    }
  }
}

// Run the script
if (require.main === module) {
  initializeRoles()
    .then(() => {
      console.log("Role initialization completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Role initialization failed:", error);
      process.exit(1);
    });
}
