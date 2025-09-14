import { Router, Request, Response } from "express";
import { OnboardingService } from "../services/onboarding.service";
import { verifyToken } from "../middleware/jwt.handler";
import { createError } from "../middleware/error.handler";
import { 
  PatientOnboardingRequest, 
  DoctorOnboardingRequest, 
  HospitalOnboardingRequest 
} from "../core/types";

export class OnboardingRoutes {
  private router: Router;
  private onboardingService: OnboardingService;

  constructor(onboardingService: OnboardingService) {
    this.router = Router();
    this.onboardingService = onboardingService;
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // All onboarding routes require authentication
    this.router.post("/patient", verifyToken, this.completePatientOnboarding.bind(this));
    this.router.post("/doctor", verifyToken, this.completeDoctorOnboarding.bind(this));
    this.router.post("/hospital", verifyToken, this.completeHospitalOnboarding.bind(this));
    this.router.put("/step", verifyToken, this.updateOnboardingStep.bind(this));
    this.router.get("/status", verifyToken, this.getOnboardingStatus.bind(this));
  }

  private async completePatientOnboarding(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const data: PatientOnboardingRequest = req.body;

      // Validate required fields
      if (!data.gender || !data.mobile || !data.dateOfBirth || !data.address || !data.bloodGroup) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields"
        });
      }

      const result = await this.onboardingService.completePatientOnboarding(userId, data);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Patient onboarding failed"
      });
    }
  }

  private async completeDoctorOnboarding(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const data: DoctorOnboardingRequest = req.body;

      // Validate required fields
      if (!data.gender || !data.mobile || !data.specializationIds || !data.qualifications || 
          !data.experienceYears || !data.address || !data.consultationModes) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields"
        });
      }

      const result = await this.onboardingService.completeDoctorOnboarding(userId, data);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Doctor onboarding failed"
      });
    }
  }

  private async completeHospitalOnboarding(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const data: HospitalOnboardingRequest = req.body;

      // Validate required fields
      if (!data.hospitalName || !data.hospitalAddress || !data.hospitalContactNo || 
          !data.hospitalEmail || !data.licenseNo || !data.adminName) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields"
        });
      }

      const result = await this.onboardingService.completeHospitalOnboarding(userId, data);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Hospital onboarding failed"
      });
    }
  }

  private async updateOnboardingStep(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { step } = req.body;

      if (typeof step !== 'number' || step < 0 || step > 3) {
        return res.status(400).json({
          success: false,
          message: "Invalid step number. Must be between 0 and 3"
        });
      }

      const result = await this.onboardingService.updateOnboardingStep(userId, step);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to update onboarding step"
      });
    }
  }

  private async getOnboardingStatus(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const result = await this.onboardingService.getOnboardingStatus(userId);
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || "Failed to get onboarding status"
      });
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}
