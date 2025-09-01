import { Repository } from "typeorm";
import { User } from "../entities/User";
import { Role } from "../entities/Role";
import { LoginRequest, RegisterRequest, AuthResponse, JwtPayload, UserRole } from "../core/types";
import { generateToken } from "../middleware/jwt.handler";
import { createError } from "../middleware/error.handler";

export class AuthService {
  constructor(
    private userRepository: Repository<User>,
    private roleRepository: Repository<Role>
  ) {}

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await this.userRepository.findOne({
        where: { email: userData.email }
      });

      if (existingUser) {
        throw createError("User with this email already exists", 400);
      }

      // Find role by name
      const role = await this.roleRepository.findOne({
        where: { name: userData.role || UserRole.PATIENT }
      });

      if (!role) {
        throw createError("Invalid role specified", 400);
      }

      // Create new user
      const user = this.userRepository.create({
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        roleId: role.id
      });

      // Save user
      const savedUser = await this.userRepository.save(user);

      // Generate token
      const token = generateToken({
        userId: savedUser.id,
        email: savedUser.email,
        role: role.name
      });

      return {
        success: true,
        message: "User registered successfully",
        token,
        user: {
          id: savedUser.id,
          email: savedUser.email,
          firstName: savedUser.firstName,
          lastName: savedUser.lastName,
          role: role.name
        }
      };
    } catch (error) {
      throw error;
    }
  }

  async login(loginData: LoginRequest): Promise<AuthResponse> {
    try {
      // Find user by email with role details
      const user = await this.userRepository.findOne({
        where: { email: loginData.email },
        relations: ["roleDetails"]
      });

      if (!user) {
        throw createError("Invalid email or password", 401);
      }

      // Check if user is active
      if (!user.isActive) {
        throw createError("Account is deactivated", 401);
      }

      // Validate password
      const isValidPassword = await user.validatePassword(loginData.password);
      if (!isValidPassword) {
        throw createError("Invalid email or password", 401);
      }

      // Generate token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.roleDetails.name as UserRole
      });

      return {
        success: true,
        message: "Login successful",
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.roleDetails.name as UserRole
        }
      };
    } catch (error) {
      throw error;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
      relations: ["roleDetails"]
    });
  }

  async updateUserProfile(userId: string, updateData: Partial<User>): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw createError("User not found", 404);
    }

    // Remove sensitive fields from update
    delete updateData.password;
    delete updateData.email;

    Object.assign(user, updateData);
    return this.userRepository.save(user);
  }
}
