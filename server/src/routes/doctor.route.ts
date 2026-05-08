import { Router, Request, Response, NextFunction } from 'express';
import { doctorService } from '../services/doctor.service';
import { doctorServiceCatalogService } from "../services/doctorServiceCatalog.service";
import { reviewService } from '../services/review.service';
import { BadRequestError } from '../middleware/error.handler';
import { ApiResponse } from '../core/api-response';
import { verifyToken, requireRole } from "../middleware/jwt.handler";
import { UserRole } from "../core/types";

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

    this.router.get(
      "/me/services",
      verifyToken,
      requireRole([UserRole.DOCTOR]),
      this.getMyServices
    );
    this.router.post(
      "/me/services",
      verifyToken,
      requireRole([UserRole.DOCTOR]),
      this.createMyService
    );
    this.router.patch(
      "/me/services/:serviceId",
      verifyToken,
      requireRole([UserRole.DOCTOR]),
      this.patchMyService
    );
    this.router.delete(
      "/me/services/:serviceId",
      verifyToken,
      requireRole([UserRole.DOCTOR]),
      this.deleteMyService
    );
    
    // Review routes - must come before /:id to avoid route conflicts
    this.router.post('/:doctorId/reviews', verifyToken, this.createReview);
    this.router.get('/:doctorId/reviews', this.getReviews);
    
    // Get doctor by ID (public endpoint)
    this.router.get('/:id', this.getDoctorById);
  }

  private getSpecializations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await doctorService.getAllSpecializations();
      res.status(200).json(ApiResponse(result, "Specializations retrieved successfully"));
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
      res.status(200).json(ApiResponse(result, "Doctors retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  private getDoctorById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doctorId = req.params.id;
      if (!doctorId) {
        return next(BadRequestError("Doctor ID is required"));
      }
      const result = await doctorService.getDoctorById(doctorId);
      res.status(200).json(ApiResponse(result, "Doctor profile retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  private getMyServices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const practiceAffiliationId = String(req.query.practiceAffiliationId || "").trim() || undefined;
      const rows = await doctorServiceCatalogService.listForDoctorUser(userId, practiceAffiliationId);
      res.status(200).json(ApiResponse(rows, "Doctor services retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  private createMyService = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const b = req.body || {};
      const practiceAffiliationId = String(b.practiceAffiliationId || "").trim();
      const serviceName = String(b.serviceName || "").trim();
      const durationMinutes = Number(b.durationMinutes);
      const pricePkr = Number(b.pricePkr);
      const description = b.description != null ? String(b.description) : null;
      if (!practiceAffiliationId || !serviceName) {
        return next(BadRequestError("practiceAffiliationId and serviceName are required"));
      }
      if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
        return next(BadRequestError("durationMinutes must be a positive number"));
      }
      if (!Number.isFinite(pricePkr) || pricePkr <= 0) {
        return next(BadRequestError("pricePkr must be a positive number"));
      }
      const row = await doctorServiceCatalogService.createForDoctorUser(userId, {
        practiceAffiliationId,
        serviceName,
        durationMinutes: Math.floor(durationMinutes),
        pricePkr,
        description,
      });
      res.status(201).json(ApiResponse(row, "Doctor service created successfully"));
    } catch (error) {
      next(error);
    }
  };

  private patchMyService = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const serviceId = req.params.serviceId;
      if (!serviceId) return next(BadRequestError("serviceId is required"));
      const b = req.body || {};
      const patch: Record<string, unknown> = {};
      if (b.practiceAffiliationId != null) patch.practiceAffiliationId = String(b.practiceAffiliationId).trim();
      if (b.serviceName != null) patch.serviceName = String(b.serviceName).trim();
      if (b.description !== undefined) patch.description = b.description == null ? null : String(b.description);
      if (b.durationMinutes != null) {
        const n = Number(b.durationMinutes);
        if (!Number.isFinite(n) || n <= 0) return next(BadRequestError("durationMinutes must be positive"));
        patch.durationMinutes = Math.floor(n);
      }
      if (b.pricePkr != null) {
        const p = Number(b.pricePkr);
        if (!Number.isFinite(p) || p <= 0) return next(BadRequestError("pricePkr must be positive"));
        patch.pricePkr = p;
      }
      const row = await doctorServiceCatalogService.updateForDoctorUser(userId, serviceId, patch as any);
      res.status(200).json(ApiResponse(row, "Doctor service updated successfully"));
    } catch (error) {
      next(error);
    }
  };

  private deleteMyService = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const serviceId = req.params.serviceId;
      if (!serviceId) return next(BadRequestError("serviceId is required"));
      const row = await doctorServiceCatalogService.deactivateForDoctorUser(userId, serviceId);
      res.status(200).json(ApiResponse(row, "Doctor service removed successfully"));
    } catch (error) {
      next(error);
    }
  };

  private createReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doctorId = req.params.doctorId;
      const userId = (req as any).user.userId;
      const { rating, comment } = req.body;

      if (!doctorId) {
        return next(BadRequestError("Doctor ID is required"));
      }

      if (!rating || rating < 1 || rating > 5) {
        return next(BadRequestError("Rating must be between 1 and 5"));
      }

      const result = await reviewService.createReview({
        userId,
        doctorId,
        rating: parseInt(rating),
        comment: comment || undefined,
      });

      res.status(201).json(ApiResponse(result, "Review created successfully"));
    } catch (error) {
      next(error);
    }
  };

  private getReviews = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doctorId = req.params.doctorId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!doctorId) {
        return next(BadRequestError("Doctor ID is required"));
      }

      if (page < 1) {
        return next(BadRequestError("Page must be greater than 0"));
      }

      if (limit < 1 || limit > 100) {
        return next(BadRequestError("Limit must be between 1 and 100"));
      }

      const result = await reviewService.getReviewsByDoctorId(doctorId, page, limit);
      res.status(200).json(ApiResponse(result, "Reviews retrieved successfully"));
    } catch (error) {
      next(error);
    }
  };

  public getRouter(): Router {
    return this.router;
  }
}

export default DoctorRoute;
