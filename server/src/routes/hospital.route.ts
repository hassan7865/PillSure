import { Router, Request, Response, NextFunction } from "express";
import { verifyToken, requireRole } from "../middleware/jwt.handler";
import { ApiResponse } from "../core/api-response";
import { BadRequestError } from "../middleware/error.handler";
import { UserRole } from "../core/types";
import { hospitalService } from "../services/hospital.service";
import { practiceAffiliationService } from "../services/practiceAffiliation.service";
import { doctorServiceCatalogService } from "../services/doctorServiceCatalog.service";
import { hospitalDoctorServiceOfferService } from "../services/hospitalDoctorServiceOffer.service";
import { hospitalServiceCatalogService } from "../services/hospitalServiceCatalog.service";

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
      "/doctors/:doctorId/services",
      verifyToken,
      requireRole([UserRole.HOSPITAL]),
      this.getHospitalDoctorServices,
    );
    this.router.get(
      "/doctors",
      verifyToken,
      requireRole([UserRole.HOSPITAL]),
      this.getHospitalDoctors,
    );
    this.router.get(
      "/services",
      verifyToken,
      requireRole([UserRole.HOSPITAL]),
      this.listHospitalServices,
    );
    this.router.post(
      "/services",
      verifyToken,
      requireRole([UserRole.HOSPITAL]),
      this.createHospitalService,
    );
    this.router.patch(
      "/services/:serviceId",
      verifyToken,
      requireRole([UserRole.HOSPITAL]),
      this.updateHospitalService,
    );
    this.router.patch(
      "/services/:serviceId/active",
      verifyToken,
      requireRole([UserRole.HOSPITAL]),
      this.setHospitalServiceActive,
    );
    this.router.get(
      "/offers",
      verifyToken,
      requireRole([UserRole.HOSPITAL]),
      this.listHospitalOffersHistory,
    );
    this.router.get(
      "/doctors/:doctorId/offers",
      verifyToken,
      requireRole([UserRole.HOSPITAL]),
      this.listHospitalDoctorOffers,
    );
    this.router.post(
      "/doctors/:doctorId/offers",
      verifyToken,
      requireRole([UserRole.HOSPITAL]),
      this.upsertHospitalDoctorOffer,
    );
    this.router.post(
      "/doctors",
      verifyToken,
      requireRole([UserRole.HOSPITAL]),
      this.createHospitalDoctor,
    );
    this.router.post(
      "/doctors/invite",
      verifyToken,
      requireRole([UserRole.HOSPITAL]),
      this.inviteHospitalDoctor,
    );
    this.router.get(
      "/affiliations/pending",
      verifyToken,
      requireRole([UserRole.HOSPITAL]),
      this.listPendingAffiliations,
    );
    this.router.patch(
      "/affiliations/:affiliationId",
      verifyToken,
      requireRole([UserRole.HOSPITAL]),
      this.patchAffiliation,
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

  private getHospitalDoctorServices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const doctorId = req.params.doctorId;
      if (!doctorId) {
        return next(BadRequestError("doctorId is required"));
      }
      const practiceAffiliationId = String(req.query.practiceAffiliationId || "").trim() || undefined;
      const rows = await doctorServiceCatalogService.listForHospitalDoctor(
        userId,
        doctorId,
        practiceAffiliationId
      );
      res.status(200).json(ApiResponse(rows, "Doctor services retrieved successfully"));
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

  private listHospitalServices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const rows = await hospitalServiceCatalogService.list(userId);
      res.status(200).json(ApiResponse(rows, "Hospital services retrieved"));
    } catch (error) {
      next(error);
    }
  };

  private createHospitalService = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const body = req.body || {};
      const row = await hospitalServiceCatalogService.create(userId, {
        serviceName: String(body.serviceName || ""),
        description: body.description ?? null,
        durationMinutes: Number(body.durationMinutes),
        rate: Number(body.rate),
        currency: String(body.currency || "PKR"),
        isActive: body.isActive !== false,
      });
      res.status(201).json(ApiResponse(row, "Hospital service created"));
    } catch (error) {
      next(error);
    }
  };

  private updateHospitalService = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const serviceId = req.params.serviceId;
      if (!serviceId) {
        return next(BadRequestError("serviceId is required"));
      }
      const body = req.body || {};
      const row = await hospitalServiceCatalogService.update(userId, serviceId, {
        serviceName: String(body.serviceName || ""),
        description: body.description ?? null,
        durationMinutes: Number(body.durationMinutes),
        rate: Number(body.rate),
        currency: String(body.currency || "PKR"),
        isActive: body.isActive !== false,
      });
      res.status(200).json(ApiResponse(row, "Hospital service updated"));
    } catch (error) {
      next(error);
    }
  };

  private setHospitalServiceActive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const serviceId = req.params.serviceId;
      if (!serviceId) {
        return next(BadRequestError("serviceId is required"));
      }
      const body = req.body || {};
      const raw = body.isActive;
      if (raw !== true && raw !== false && raw !== "true" && raw !== "false") {
        return next(BadRequestError("isActive must be true or false"));
      }
      const isActive = raw === true || raw === "true";
      const row = await hospitalServiceCatalogService.setActive(userId, serviceId, isActive);
      res.status(200).json(ApiResponse(row, "Hospital service status updated"));
    } catch (error) {
      next(error);
    }
  };

  private listHospitalDoctorOffers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const doctorId = req.params.doctorId;
      if (!doctorId) {
        return next(BadRequestError("doctorId is required"));
      }
      const rows = await hospitalDoctorServiceOfferService.listOffersForHospitalDoctor({
        hospitalUserId: userId,
        doctorId,
      });
      res.status(200).json(ApiResponse(rows, "Doctor offers retrieved"));
    } catch (error) {
      next(error);
    }
  };

  private listHospitalOffersHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const rows = await hospitalDoctorServiceOfferService.listOffersForHospital(userId);
      res.status(200).json(ApiResponse(rows, "Hospital offers history"));
    } catch (error) {
      next(error);
    }
  };

  private upsertHospitalDoctorOffer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const doctorId = req.params.doctorId;
      if (!doctorId) {
        return next(BadRequestError("doctorId is required"));
      }
      const body = req.body || {};
      const practiceAffiliationId = String(body.practiceAffiliationId || "").trim();
      if (!practiceAffiliationId) {
        return next(BadRequestError("practiceAffiliationId is required"));
      }
      if (!body.offer || typeof body.offer !== "object") {
        return next(BadRequestError("offer object is required"));
      }
      const offer = await hospitalDoctorServiceOfferService.upsertHospitalOffer({
        hospitalUserId: userId,
        doctorId,
        practiceAffiliationId,
        offer: body.offer,
      });
      res.status(200).json(ApiResponse(offer, "Offer saved"));
    } catch (error) {
      next(error);
    }
  };

  private inviteHospitalDoctor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const email = String((req.body || {}).email || "").trim();
      if (!email) {
        return next(BadRequestError("email is required"));
      }
      const result = await practiceAffiliationService.inviteDoctorToHospital(userId, email);
      res.status(200).json(ApiResponse(result, "Doctor linked to hospital"));
    } catch (error) {
      next(error);
    }
  };

  private listPendingAffiliations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const rows = await practiceAffiliationService.listPendingForHospital(userId);
      res.status(200).json(ApiResponse(rows, "Pending affiliation requests"));
    } catch (error) {
      next(error);
    }
  };

  private patchAffiliation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const affiliationId = req.params.affiliationId;
      const status = String((req.body || {}).status || "").toLowerCase();
      if (!affiliationId) {
        return next(BadRequestError("affiliationId is required"));
      }
      if (!["active", "ended", "suspended", "rejected"].includes(status)) {
        return next(BadRequestError("status must be active, ended, suspended, or rejected"));
      }
      const mapped = status === "rejected" ? "ended" : status;
      const result = await practiceAffiliationService.setAffiliationStatusByHospital(
        userId,
        affiliationId,
        mapped as "active" | "ended" | "suspended" | "pending"
      );
      res.status(200).json(ApiResponse(result, "Affiliation updated"));
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
