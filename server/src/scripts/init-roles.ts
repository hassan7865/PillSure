import { db } from '../config/database';
import { roles } from '../schema';
import { UserRole } from '../core/types';

const initializeRoles = async () => {
  try {
    console.log('Initializing roles...');

    // Check if roles already exist
    const existingRoles = await db.select().from(roles);
    
    if (existingRoles.length > 0) {
      console.log('Roles already exist, skipping initialization');
      return;
    }

    // Insert default roles
    await db.insert(roles).values([
      {
        name: UserRole.PATIENT,
        description: 'Patient role for accessing patient features',
        isActive: true
      },
      {
        name: UserRole.DOCTOR,
        description: 'Doctor role for accessing doctor features',
        isActive: true
      },
      {
        name: UserRole.HOSPITAL,
        description: 'Hospital role for accessing hospital features',
        isActive: true
      },
      {
        name: UserRole.ADMIN,
        description: 'Admin role for system administration',
        isActive: true
      }
    ]);

    console.log('Roles initialized successfully');
  } catch (error) {
    console.error('Failed to initialize roles:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  initializeRoles();
}

export { initializeRoles };