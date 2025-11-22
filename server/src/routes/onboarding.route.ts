import { Router, Request, Response, NextFunction } from "express";
import { OnboardingService } from "../services/onboarding.service";
import { verifyToken } from "../middleware/jwt.handler";
import { 
  BadRequestError, 
  ValidationError 
} from "../middleware/error.handler";
import { 
  PatientOnboardingRequest, 
  DoctorOnboardingRequest, 
  HospitalOnboardingRequest 
} from "../core/types";
import { ApiResponse } from "../core/api-response";

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
    // These endpoints handle both create and update automatically
    this.router.post("/patient", verifyToken, this.savePatientOnboarding.bind(this));
    this.router.post("/doctor", verifyToken, this.saveDoctorOnboarding.bind(this));
    this.router.post("/hospital", verifyToken, this.saveHospitalOnboarding.bind(this));
    this.router.put("/step", verifyToken, this.updateOnboardingStep.bind(this));
    this.router.get("/status", verifyToken, this.getOnboardingStatus.bind(this));
    
    // Get saved onboarding data
    this.router.get("/patient", verifyToken, this.getPatientOnboarding.bind(this));
    this.router.get("/doctor", verifyToken, this.getDoctorOnboarding.bind(this));
    this.router.get("/hospital", verifyToken, this.getHospitalOnboarding.bind(this));
  }

  // Unified save endpoints - handle both create and update
  private async savePatientOnboarding(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const data: PatientOnboardingRequest = req.body;

      const result = await this.onboardingService.savePatientOnboarding(userId, data);
      res.status(200).json(ApiResponse(result, "Patient data saved successfully"));
    } catch (error) {
      next(error);
    }
  }

  private async saveDoctorOnboarding(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const data: DoctorOnboardingRequest = req.body;

      const result = await this.onboardingService.saveDoctorOnboarding(userId, data);
      res.status(200).json(ApiResponse(result, "Doctor data saved successfully"));
    } catch (error) {
      next(error);
    }
  }

  private async saveHospitalOnboarding(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const data: HospitalOnboardingRequest = req.body;

      const result = await this.onboardingService.saveHospitalOnboarding(userId, data);
      res.status(200).json(ApiResponse(result, "Hospital data saved successfully"));
    } catch (error) {
      next(error);
    }
  }

  // Get saved onboarding data
  private async getPatientOnboarding(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const result = await this.onboardingService.getPatientData(userId);
      res.status(200).json(ApiResponse(result, "Patient data retrieved successfully"));
    } catch (error) {
      next(error);
    }
  }

  private async getDoctorOnboarding(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const result = await this.onboardingService.getDoctorData(userId);
      res.status(200).json(ApiResponse(result, "Doctor data retrieved successfully"));
    } catch (error) {
      next(error);
    }
  }

  private async getHospitalOnboarding(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const result = await this.onboardingService.getHospitalData(userId);
      res.status(200).json(ApiResponse(result, "Hospital data retrieved successfully"));
    } catch (error) {
      next(error);
    }
  }

  private async updateOnboardingStep(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const { step } = req.body;

      if (typeof step !== 'number' || step < 0 || step > 3) {
        return next(ValidationError("Invalid step number. Must be between 0 and 3"));
      }

      const result = await this.onboardingService.updateOnboardingStep(userId, step);
      res.status(200).json(ApiResponse(result, `Onboarding step updated to ${step}`));
    } catch (error) {
      next(error);
    }
  }

  private async getOnboardingStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.userId;
      const result = await this.onboardingService.getOnboardingStatus(userId);
      res.status(200).json(ApiResponse(result, "Onboarding status retrieved successfully"));
    } catch (error) {
      next(error);
    }
  }


  public getRouter(): Router {
    return this.router;
  }
}
