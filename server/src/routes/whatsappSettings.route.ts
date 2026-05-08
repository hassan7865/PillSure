import { Router, Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "../config/database";
import { whatsappBusinessAccounts } from "../schema/whatsappBusinessAccounts";
import { doctors } from "../schema/doctor";
import { hospitals } from "../schema/hospitals";
import { verifyToken, requireRole } from "../middleware/jwt.handler";
import { UserRole } from "../core/types";
import { ApiResponse } from "../core/api-response";
import { BadRequestError } from "../middleware/error.handler";

/** Safe hint for the UI: last 4 chars only (never send full token to client). */
const maskToken = (t: string) => {
  if (!t || t.length < 4) {
    return "";
  }
  return `••••${t.slice(-4)}`;
};

export class WhatsAppSettingsRoute {
  private router: Router;

  constructor() {
    this.router = Router();
    this.router.get(
      "/whatsapp",
      verifyToken,
      requireRole([UserRole.DOCTOR, UserRole.HOSPITAL]),
      this.getSettings
    );
    this.router.patch(
      "/whatsapp",
      verifyToken,
      requireRole([UserRole.DOCTOR, UserRole.HOSPITAL]),
      this.patchSettings
    );
  }

  private getSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const role = (req as any).user.role as string;
      let profileDoctorId: string | null = null;
      if (role === UserRole.DOCTOR) {
        const docRows = await db
          .select({ id: doctors.id })
          .from(doctors)
          .where(eq(doctors.userId, userId))
          .limit(1);
        profileDoctorId = docRows[0]?.id ?? null;
      }
      const rows = await db
        .select()
        .from(whatsappBusinessAccounts)
        .where(eq(whatsappBusinessAccounts.ownerUserId, userId))
        .limit(1);
      const row = rows[0];
      return res.status(200).json(
        ApiResponse(
          {
            profileDoctorId,
            account: row
              ? {
                  id: row.id,
                  phoneNumberId: row.phoneNumberId,
                  displayPhoneNumber: row.displayPhoneNumber,
                  accessTokenMasked: maskToken(row.accessToken),
                  whatsappAppId: row.whatsappAppId,
                  wabaId: row.wabaId,
                  doctorId: row.doctorId,
                  hospitalId: row.hospitalId,
                  defaultPracticeAffiliationId: row.defaultPracticeAffiliationId,
                  allowedDoctorIds: row.allowedDoctorIds,
                  isSetupComplete: row.isSetupComplete,
                }
              : null,
          },
          "OK"
        )
      );
    } catch (e) {
      next(e);
    }
  };

  private patchSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const role = (req as any).user.role as string;
      const b = req.body || {};
      const phoneNumberId = b.phoneNumberId as string | undefined;
      const displayPhoneNumber = b.displayPhoneNumber as string | undefined;
      const accessToken = b.accessToken as string | undefined;
      const whatsappAppId = b.whatsappAppId as string | undefined;
      const wabaId = b.wabaId as string | undefined;
      let doctorId = b.doctorId as string | undefined;
      const incomingHospitalId = b.hospitalId as string | undefined;
      const allowedDoctorIdsRaw = b.allowedDoctorIds as string[] | undefined;
      const defaultPracticeAffiliationId = b.defaultPracticeAffiliationId as string | undefined | null;
      let hospitalId = incomingHospitalId;

      const allowedDoctorIds = Array.isArray(allowedDoctorIdsRaw)
        ? [...new Set(
            allowedDoctorIdsRaw
              .map((id) => String(id || "").trim())
              .filter((id) => /^[0-9a-f-]{36}$/i.test(id))
          )]
        : undefined;

      if (role === UserRole.DOCTOR) {
        const docRows = await db
          .select({ id: doctors.id })
          .from(doctors)
          .where(eq(doctors.userId, userId))
          .limit(1);
        doctorId = docRows[0]?.id ?? undefined;
      }
      if (role === UserRole.HOSPITAL) {
        const hospitalRows = await db
          .select({ id: hospitals.id })
          .from(hospitals)
          .where(eq(hospitals.userId, userId))
          .limit(1);
        hospitalId = hospitalRows[0]?.id ?? null;
      }

      if (!phoneNumberId || !whatsappAppId) {
        return next(BadRequestError("phoneNumberId and whatsappAppId are required"));
      }

      const existing = await db
        .select()
        .from(whatsappBusinessAccounts)
        .where(eq(whatsappBusinessAccounts.ownerUserId, userId))
        .limit(1);

      const tokenToStore =
        accessToken && accessToken.trim().length > 0
          ? accessToken.trim()
          : existing[0]?.accessToken;
      if (!tokenToStore) {
        return next(BadRequestError("accessToken is required on first save"));
      }

      if (existing.length) {
        await db
          .update(whatsappBusinessAccounts)
          .set({
            phoneNumberId,
            displayPhoneNumber: displayPhoneNumber ?? null,
            accessToken: tokenToStore,
            whatsappAppId,
            wabaId: wabaId ?? null,
            doctorId: doctorId ?? null,
            hospitalId: hospitalId ?? null,
            defaultPracticeAffiliationId:
              defaultPracticeAffiliationId === undefined
                ? existing[0].defaultPracticeAffiliationId
                : defaultPracticeAffiliationId,
            allowedDoctorIds: allowedDoctorIds ?? null,
            isSetupComplete: true,
            updatedAt: new Date(),
          })
          .where(eq(whatsappBusinessAccounts.id, existing[0].id));
      } else {
        await db.insert(whatsappBusinessAccounts).values({
          ownerUserId: userId,
          phoneNumberId,
          displayPhoneNumber: displayPhoneNumber ?? null,
          accessToken: tokenToStore,
          whatsappAppId,
          wabaId: wabaId ?? null,
          doctorId: doctorId ?? null,
          hospitalId: hospitalId ?? null,
          defaultPracticeAffiliationId: defaultPracticeAffiliationId ?? null,
          allowedDoctorIds: allowedDoctorIds ?? null,
          isSetupComplete: true,
        });
      }

      return res.status(200).json(ApiResponse(null, "WhatsApp settings saved"));
    } catch (e) {
      next(e);
    }
  };

  getRouter() {
    return this.router;
  }
}
