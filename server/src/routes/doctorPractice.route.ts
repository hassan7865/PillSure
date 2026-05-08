import { Router, Request, Response, NextFunction } from "express";
import { verifyToken, requireRole } from "../middleware/jwt.handler";
import { ApiResponse } from "../core/api-response";
import { BadRequestError } from "../middleware/error.handler";
import { UserRole } from "../core/types";
import { practiceAffiliationService } from "../services/practiceAffiliation.service";
import { hospitalDoctorServiceOfferService } from "../services/hospitalDoctorServiceOffer.service";

export class DoctorPracticeRoute {
  private router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(
      "/base-half-hour-slots",
      verifyToken,
      requireRole([UserRole.DOCTOR]),
      this.getBaseHalfHourSlots,
    );
    this.router.get(
      "/affiliations",
      verifyToken,
      requireRole([UserRole.DOCTOR]),
      this.listAffiliations,
    );
    this.router.post(
      "/private",
      verifyToken,
      requireRole([UserRole.DOCTOR]),
      this.ensurePrivate,
    );
    this.router.post(
      "/affiliations/:affiliationId/accept-invite",
      verifyToken,
      requireRole([UserRole.DOCTOR]),
      this.acceptOrgInvite,
    );
    this.router.post(
      "/affiliations/:affiliationId/reject-invite",
      verifyToken,
      requireRole([UserRole.DOCTOR]),
      this.rejectOrgInvite,
    );
    this.router.patch(
      "/affiliations/:affiliationId/schedule",
      verifyToken,
      requireRole([UserRole.DOCTOR]),
      this.patchSchedule,
    );
    this.router.post(
      "/request-hospital",
      verifyToken,
      requireRole([UserRole.DOCTOR]),
      this.requestHospital,
    );
    this.router.post(
      "/availability-exceptions",
      verifyToken,
      requireRole([UserRole.DOCTOR]),
      this.addException,
    );
    this.router.get(
      "/offers",
      verifyToken,
      requireRole([UserRole.DOCTOR]),
      this.listOffers,
    );
    this.router.post(
      "/offers/:offerId/recheck-conflicts",
      verifyToken,
      requireRole([UserRole.DOCTOR]),
      this.recheckOfferConflicts,
    );
    this.router.post(
      "/offers/:offerId/accept",
      verifyToken,
      requireRole([UserRole.DOCTOR]),
      this.acceptOffer,
    );
    this.router.post(
      "/offers/:offerId/reject",
      verifyToken,
      requireRole([UserRole.DOCTOR]),
      this.rejectOffer,
    );
  }

  private getBaseHalfHourSlots = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const data = await practiceAffiliationService.getDoctorBaseHalfHourSlotsForDoctorUser(userId);
      res.status(200).json(ApiResponse(data, "Base half-hour slots from your profile"));
    } catch (e) {
      next(e);
    }
  };

  private listAffiliations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const rows = await practiceAffiliationService.listForDoctorUser(userId);
      res.status(200).json(ApiResponse(rows, "Practice affiliations"));
    } catch (e) {
      next(e);
    }
  };

  private ensurePrivate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const row = await practiceAffiliationService.ensurePrivateAffiliationForDoctorUser(userId);
      res.status(200).json(ApiResponse(row, "Private practice affiliation ready"));
    } catch (e) {
      next(e);
    }
  };

  private acceptOrgInvite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const affiliationId = req.params.affiliationId;
      if (!affiliationId) {
        return next(BadRequestError("affiliationId is required"));
      }
      const result = await practiceAffiliationService.doctorAcceptOrgInvite(userId, affiliationId);
      res.status(200).json(ApiResponse(result, "Invitation accepted"));
    } catch (e) {
      next(e);
    }
  };

  private rejectOrgInvite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const affiliationId = req.params.affiliationId;
      if (!affiliationId) {
        return next(BadRequestError("affiliationId is required"));
      }
      const result = await practiceAffiliationService.doctorRejectOrgInvite(userId, affiliationId);
      res.status(200).json(ApiResponse(result, "Invitation declined"));
    } catch (e) {
      next(e);
    }
  };

  private patchSchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const affiliationId = req.params.affiliationId;
      if (!affiliationId) {
        return next(BadRequestError("affiliationId is required"));
      }
      const weeklySchedule = (req.body || {}).weeklySchedule;
      if (!weeklySchedule || typeof weeklySchedule !== "object") {
        return next(BadRequestError("weeklySchedule object is required"));
      }
      const result = await practiceAffiliationService.updateWeeklyScheduleForDoctor(
        userId,
        affiliationId,
        weeklySchedule,
      );
      res.status(200).json(ApiResponse(result, "Schedule updated"));
    } catch (e) {
      next(e);
    }
  };

  private requestHospital = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const hospitalId = String((req.body || {}).hospitalId || "").trim();
      if (!hospitalId) {
        return next(BadRequestError("hospitalId is required"));
      }
      const result = await practiceAffiliationService.requestJoinHospital(userId, hospitalId);
      res.status(201).json(ApiResponse(result, "Request submitted"));
    } catch (e) {
      next(e);
    }
  };

  private addException = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const b = req.body || {};
      if (!b.exceptionDate) {
        return next(BadRequestError("exceptionDate is required (YYYY-MM-DD)"));
      }
      const result = await practiceAffiliationService.addAvailabilityExceptionForDoctor(userId, {
        exceptionDate: String(b.exceptionDate),
        isFullDay: b.isFullDay !== false,
        startTime: b.startTime,
        endTime: b.endTime,
        reason: b.reason,
        practiceAffiliationId: b.practiceAffiliationId ?? null,
      });
      res.status(201).json(ApiResponse(result, "Exception saved"));
    } catch (e) {
      next(e);
    }
  };

  private listOffers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const rows = await hospitalDoctorServiceOfferService.listOffersForDoctor(userId);
      res.status(200).json(ApiResponse(rows, "Service offers"));
    } catch (e) {
      next(e);
    }
  };

  private acceptOffer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const offerId = req.params.offerId;
      if (!offerId) {
        return next(BadRequestError("offerId is required"));
      }
      const result = await hospitalDoctorServiceOfferService.acceptOffer(userId, offerId);
      res.status(200).json(ApiResponse(result, "Offer accepted"));
    } catch (e) {
      next(e);
    }
  };

  private recheckOfferConflicts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const offerId = req.params.offerId;
      if (!offerId) {
        return next(BadRequestError("offerId is required"));
      }
      const result = await hospitalDoctorServiceOfferService.recheckOfferConflicts(userId, offerId);
      res.status(200).json(ApiResponse(result, "Offer conflicts rechecked"));
    } catch (e) {
      next(e);
    }
  };

  private rejectOffer = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId;
      const offerId = req.params.offerId;
      if (!offerId) {
        return next(BadRequestError("offerId is required"));
      }
      const result = await hospitalDoctorServiceOfferService.rejectOffer(userId, offerId);
      res.status(200).json(ApiResponse(result, "Offer rejected"));
    } catch (e) {
      next(e);
    }
  };

  getRouter() {
    return this.router;
  }
}
