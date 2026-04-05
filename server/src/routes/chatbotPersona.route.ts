import { Router, Request, Response, NextFunction } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../config/database";
import { chatbotPersonas, type ChatbotPersonaService, type ChatbotBusinessInfo } from "../schema/chatbotPersonas";
import { doctors } from "../schema/doctor";
import { verifyToken, requireRole } from "../middleware/jwt.handler";
import { UserRole } from "../core/types";
import { ApiResponse } from "../core/api-response";
import { BadRequestError } from "../middleware/error.handler";
import { suggestedServicesFromDoctorProfile } from "../utils/suggestedChatbotServices";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3.5";

export class ChatbotPersonaRoute {
  private router: Router;

  constructor() {
    this.router = Router();
    this.router.get(
      "/persona",
      verifyToken,
      requireRole([UserRole.DOCTOR, UserRole.HOSPITAL]),
      this.getPersona
    );
    this.router.put(
      "/persona",
      verifyToken,
      requireRole([UserRole.DOCTOR, UserRole.HOSPITAL]),
      this.putPersona
    );
    this.router.post(
      "/persona/generate",
      verifyToken,
      requireRole([UserRole.DOCTOR, UserRole.HOSPITAL]),
      this.generatePersona
    );
  }

  private getPersona = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const role = (req as any).user.role as string;
      const rows = await db
        .select()
        .from(chatbotPersonas)
        .where(and(eq(chatbotPersonas.ownerUserId, userId), eq(chatbotPersonas.isActive, true)))
        .limit(1);

      let suggestedServices: ChatbotPersonaService[] | null = null;
      if (role === UserRole.DOCTOR) {
        const docRows = await db
          .select({
            feePkr: doctors.feePkr,
            openingTime: doctors.openingTime,
            closingTime: doctors.closingTime,
            availableDays: doctors.availableDays,
          })
          .from(doctors)
          .where(eq(doctors.userId, userId))
          .limit(1);
        if (docRows[0]) {
          suggestedServices = suggestedServicesFromDoctorProfile(docRows[0]);
        }
      }

      return res.status(200).json(
        ApiResponse({ persona: rows[0] || null, suggestedServices }, "OK")
      );
    } catch (e) {
      next(e);
    }
  };

  private putPersona = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const b = req.body || {};
      if (!b.businessName || !b.ownerName || !b.persona) {
        return next(BadRequestError("businessName, ownerName, and persona are required"));
      }
      const services = (b.services as ChatbotPersonaService[]) || [];
      const existing = await db
        .select()
        .from(chatbotPersonas)
        .where(and(eq(chatbotPersonas.ownerUserId, userId), eq(chatbotPersonas.isActive, true)))
        .limit(1);

      if (existing.length) {
        const [row] = await db
          .update(chatbotPersonas)
          .set({
            businessName: b.businessName,
            businessType: b.businessType || "healthcare",
            ownerName: b.ownerName,
            persona: b.persona,
            businessInfo: (b.businessInfo as ChatbotBusinessInfo) || null,
            services,
            whatsappNumber: b.whatsappNumber || null,
            logoUrl: b.logoUrl || null,
            updatedAt: new Date(),
          })
          .where(eq(chatbotPersonas.id, existing[0].id))
          .returning();
        return res.status(200).json(ApiResponse(row, "Updated"));
      }

      const [row] = await db
        .insert(chatbotPersonas)
        .values({
          ownerUserId: userId,
          businessName: b.businessName,
          businessType: b.businessType || "healthcare",
          ownerName: b.ownerName,
          persona: b.persona,
          businessInfo: (b.businessInfo as ChatbotBusinessInfo) || null,
          services,
          whatsappNumber: b.whatsappNumber || null,
          logoUrl: b.logoUrl || null,
          isActive: true,
        })
        .returning();
      return res.status(201).json(ApiResponse(row, "Created"));
    } catch (e) {
      next(e);
    }
  };

  private generatePersona = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const b = req.body || {};
      const businessName = b.businessName as string;
      const businessType = (b.businessType as string) || "healthcare";
      const ownerName = b.ownerName as string;
      const about = (b.about as string) || "";
      if (!businessName || !ownerName) {
        return next(BadRequestError("businessName and ownerName are required"));
      }
      const prompt = `Write a concise WhatsApp assistant persona (2-4 short paragraphs) for ${ownerName} at ${businessName}, a ${businessType}. Context: ${about}. Tone: warm, professional, helpful for booking appointments. Output plain text only.`;
      const resOllama = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: [{ role: "user", content: prompt }],
          stream: false,
          options: { temperature: 0.7, num_predict: 500 },
        }),
      });
      if (!resOllama.ok) {
        return next(BadRequestError("Ollama request failed"));
      }
      const data = (await resOllama.json()) as { message?: { content?: string } };
      const persona = (data.message?.content || "").trim();
      return res.status(200).json(ApiResponse({ persona }, "Generated"));
    } catch (e) {
      next(e);
    }
  };

  getRouter() {
    return this.router;
  }
}
