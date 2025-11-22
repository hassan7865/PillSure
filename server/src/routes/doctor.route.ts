import { Router, Request, Response, NextFunction } from 'express';
import { doctorService } from '../services/doctor.service';
import { BadRequestError } from '../middleware/error.handler';
import { createSuccessResponse } from '../core/api-response';
import { verifyToken } from '../middleware/jwt.handler';

export class DoctorRoute {
  private router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Get all specializations (public endpoint)
    this.router.get('/specializations', this.getSpecializations);
    // Get all doctors with search and filter (public endpoint)
    this.router.get('/search-doctors', this.getDoctors);
    // Get current doctor profile (protected endpoint)
    this.router.get('/me', verifyToken, this.getCurrentDoctor);
  }

  private getSpecializations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await doctorService.getAllSpecializations();
      res.status(200).json(createSuccessResponse(result, "Specializations retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  private getDoctors = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract query parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string || '';
      const specializationIds = req.query.specializationIds as string || '';

      // Validate pagination parameters
      if (page < 1) {
        return next(BadRequestError("Page must be greater than 0"));
      }
      if (limit < 1 || limit > 100) {
        return next(BadRequestError("Limit must be between 1 and 100"));
      }

      // Parse specialization IDs (comma-separated string)
      const specializationIdsArray = specializationIds 
        ? specializationIds.split(',').map(id => id.trim()).filter(id => id)
        : [];

      const result = await doctorService.getAllDoctors(page, limit, specializationIdsArray, search);
      res.status(200).json(createSuccessResponse(result, "Doctors retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  private getCurrentDoctor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const result = await doctorService.getDoctorByUserId(userId);
      res.status(200).json(createSuccessResponse(result, "Doctor profile retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  public getRouter(): Router {
    return this.router;
  }
}

export default DoctorRoute;
