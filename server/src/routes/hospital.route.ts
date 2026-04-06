import { Router, Request, Response, NextFunction } from "express";
import { verifyToken, requireRole } from "../middleware/jwt.handler";
import { ApiResponse } from "../core/api-response";
import { BadRequestError } from "../middleware/error.handler";
import { UserRole } from "../core/types";
import { hospitalService } from "../services/hospital.service";

export class HospitalRoute {
  private router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(
      "/dashboard-stats",
      verifyToken,
      requireRole([UserRole.HOSPITAL]),
      this.getHospitalDashboardStats,
    );
    this.router.get(
      "/doctors/:doctorId/appointments",
      verifyToken,
      requireRole([UserRole.HOSPITAL]),
      this.getHospitalDoctorAppointments,
    );
    this.router.get(
      "/doctors",
      verifyToken,
      requireRole([UserRole.HOSPITAL]),
      this.getHospitalDoctors,
    );
    this.router.post(
      "/doctors",
      verifyToken,
      requireRole([UserRole.HOSPITAL]),
      this.createHospitalDoctor,
    );
    this.router.patch(
      "/doctors/:doctorId",
      verifyToken,
      requireRole([UserRole.HOSPITAL]),
      this.setHospitalDoctorActive,
    );
  }

  private getHospitalDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const result = await hospitalService.getHospitalDashboardStatsByUserId(userId);
      res.status(200).json(ApiResponse(result, "Hospital dashboard statistics retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  private getHospitalDoctorAppointments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const doctorId = req.params.doctorId;
      if (!doctorId) {
        return next(BadRequestError("doctorId is required"));
      }
      const result = await hospitalService.getHospitalDoctorAppointmentsByUserId(userId, doctorId);
      res.status(200).json(ApiResponse(result, "Doctor appointments retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  private getHospitalDoctors = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const result = await hospitalService.getHospitalDoctorsByUserId(userId);
      res.status(200).json(ApiResponse(result, "Hospital doctors retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  private createHospitalDoctor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const result = await hospitalService.createHospitalDoctorByUserId(userId, req.body || {});
      res
        .status(201)
        .json(
          ApiResponse(
            result,
            "Doctor account created and linked to your hospital. They can sign in and complete onboarding.",
          ),
        );
    } catch (error) {
      next(error);
    }
  };

  private setHospitalDoctorActive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const doctorId = req.params.doctorId;
      if (!doctorId) {
        return next(BadRequestError("doctorId is required"));
      }
      const body = req.body || {};
      const raw = body.isActive;
      if (raw !== true && raw !== false && raw !== "true" && raw !== "false") {
        return next(BadRequestError("isActive must be true or false"));
      }
      const isActive = raw === true || raw === "true";
      const result = await hospitalService.setHospitalDoctorActiveByUserId(userId, doctorId, isActive);
      res.status(200).json(ApiResponse(result, "Doctor status updated successfully"));
    } catch (error) {
      next(error);
    }
  };

  public getRouter(): Router {
    return this.router;
  }
}
