import { Router, Request, Response, NextFunction } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../config/database";
import { chatbotPersonas, type ChatbotPersonaService, type ChatbotBusinessInfo } from "../schema/chatbotPersonas";
import { doctors } from "../schema/doctor";
import { hospitals } from "../schema/hospitals";
import { hospitalServiceCatalog } from "../schema/hospitalServiceCatalog";
import { doctorPracticeAffiliations } from "../schema/doctorPracticeAffiliations";
import { doctorServices } from "../schema/doctorServices";
import { verifyToken, requireRole } from "../middleware/jwt.handler";
import { UserRole } from "../core/types";
import { ApiResponse } from "../core/api-response";
import { BadRequestError } from "../middleware/error.handler";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1";
const OLLAMA_FALLBACK_MODEL = process.env.OLLAMA_FALLBACK_MODEL || "llama3.1";
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 120000);
const OLLAMA_PERSONA_NUM_PREDICT = Number(process.env.OLLAMA_PERSONA_NUM_PREDICT || 4000);

const OLLAMA_PERSONA_SYSTEM_MESSAGE = `You are an expert at creating chatbot personas for businesses. Create a detailed, professional, and engaging persona that represents the business accurately.

IMPORTANT: Respond ONLY with a valid JSON object. Do not include any markdown formatting, code blocks, or additional text.

The JSON should have this exact structure:
{
  "identity": "description of who the chatbot is",
  "tone": "description of communication style",
  "expertise": ["area1", "area2"],
  "greetingMessage": "welcome message",
  "farewellMessage": "goodbye message",
  "serviceKnowledge": [{"service": "name", "keyPoints": ["point1", "point2"]}],
  "bookingInstructions": "how to handle booking requests",
  "commonQuestions": [{"question": "q", "answer": "a"}],
  "unavailableResponse": "message when service not available",
  "language": "primary language",
  "fallbackMessage": "message when unsure"
}`;

const buildPersonaPrompt = (params: {
  businessInfo: ChatbotBusinessInfo;
  services: ChatbotPersonaService[];
  whatsappNumber?: string | null;
  preferences?: { chatbotTone?: string; language?: string } | null;
}) => {
  const { businessInfo, services, whatsappNumber, preferences } = params;

  const servicesList = services
    .map(
      (service) =>
        `- ${service.serviceName}: ${service.description || ""} (${service.price ?? ""} ${service.currency || ""}, Duration: ${service.slotDuration || ""})`
    )
    .join("\n");

  const availabilityInfo = services
    .map((service) => {
      const slots = (service.availabilitySlots || [])
        .map((slot) => `${slot.startTime}-${slot.endTime}`)
        .join(", ");
      return `${service.serviceName}: Available at ${slots || "hours to be confirmed"}`;
    })
    .join("\n");

  const tone = preferences?.chatbotTone || "professional and friendly";
  const language =
    preferences?.language || "English (with Portuguese support for Brazilian market)";

  return `
Create a structured chatbot persona JSON for the following business:

**Business Information:**
- Business Name: ${businessInfo.businessName || ""}
- Business Type: ${businessInfo.businessType || "healthcare"}
- Owner: ${businessInfo.ownerName || ""}
- About: ${businessInfo.about || ""}
- Location: ${(businessInfo.locations || []).join(", ")}
- Contact: ${businessInfo.businessEmail || ""}, ${businessInfo.phoneNumber || ""}
${whatsappNumber ? `- WhatsApp: ${whatsappNumber}` : ""}

**Services Offered:**
${servicesList || "- No services listed."}

**Availability:**
${availabilityInfo || "No availability data provided."}

**Preferred Tone:** ${tone}
**Language:** ${language}

**Instructions:**
Create a comprehensive chatbot persona with the following characteristics:
1. Identity: Represents the business owner (${businessInfo.ownerName || ""}) professionally
2. Tone: ${tone}, engaging and customer-focused
3. Expertise: Deep knowledge of all services, pricing, and booking processes
4. Language: ${language}
5. Greeting: Warm, welcoming message that introduces the business
6. Service Knowledge: Detailed understanding of each service with key selling points
7. Booking Process: Clear instructions on how to book appointments
8. Common Questions: Anticipate and answer 8-10 frequently asked questions about:
   - Service details and duration
   - Pricing and payment options
   - Cancellation and rescheduling policies
   - Location and parking information
   - Special requirements or preparations
9. Unavailable Scenarios: Professional responses when services aren't available
10. Fallback: Helpful message when the chatbot doesn't understand

The persona should speak in first person, representing the business warmly and professionally. Consider the Brazilian market context (RG, CPF mentions suggest Brazil).

Return ONLY a valid JSON object with the structure specified in the system message.
  `.trim();
};

const createFallbackPersona = (
  businessInfo: ChatbotBusinessInfo,
  services: ChatbotPersonaService[]
): string => {
  const name = businessInfo.businessName || "the business";
  const serviceNames = services.map((s) => s.serviceName).join(", ");

  const fallbackPersona = {
    identity: `I am the digital assistant for ${name}, helping customers learn about our services and book appointments.`,
    tone: "Professional, friendly, and helpful",
    expertise: services.map((s) => s.serviceName),
    greetingMessage: `Hello! Welcome to ${name}. I'm here to help you with our services and appointments. How can I assist you today?`,
    farewellMessage: `Thank you for contacting ${name}. We look forward to serving you soon!`,
    serviceKnowledge: services.map((service) => ({
      service: service.serviceName,
      keyPoints: [
        `${service.description || ""}`,
        `Price: ${service.price ?? ""} ${service.currency || ""}`,
        `Duration: ${service.slotDuration || ""}`,
      ],
    })),
    bookingInstructions:
      "To book an appointment, please let me know which service you're interested in and your preferred date and time.",
    commonQuestions: [
      {
        question: "What services do you offer?",
        answer: `We offer ${serviceNames || "several services"}. Each service is tailored to meet your needs.`,
      },
      {
        question: "How can I book an appointment?",
        answer:
          "You can book by telling me your preferred service, date, and time. I'll check availability and confirm your booking.",
      },
    ],
    unavailableResponse:
      "I apologize, but that time slot is not available. Let me suggest some alternative times that work better.",
    language: "English",
    fallbackMessage:
      "I'm not sure I understood that. Could you please rephrase your question? I can help with service information, pricing, and bookings.",
  };

  return JSON.stringify(fallbackPersona);
};

type OllamaChatEnvelope = { message?: { content?: string } };

const parseOllamaChatResponse = async (resOllama: globalThis.Response): Promise<string> => {
  const responseText = await resOllama.text();

  let analysisData: OllamaChatEnvelope | null = null;

  try {
    analysisData = JSON.parse(responseText) as OllamaChatEnvelope;
  } catch {
    const lines = responseText.trim().split("\n");
    let lastValidMessage: OllamaChatEnvelope | null = null;
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line) as OllamaChatEnvelope;
        if (parsed.message?.content) {
          lastValidMessage = parsed;
        }
      } catch {
        continue;
      }
    }
    if (!lastValidMessage) {
      throw new Error("Could not parse response from Ollama API");
    }
    analysisData = lastValidMessage;
  }

  if (!analysisData) {
    throw new Error("Could not parse response from Ollama API");
  }

  const generatedPersona =
    analysisData.message?.content?.trim() ||
    "I apologize, but I need a moment to process that. Could you please try again?";

  return generatedPersona;
};

const requestOllamaPersona = async (params: {
  model: string;
  prompt: string;
}): Promise<globalThis.Response> => {
  return fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: params.model,
      messages: [
        {
          role: "system",
          content: OLLAMA_PERSONA_SYSTEM_MESSAGE,
        },
        { role: "user", content: params.prompt },
      ],
      stream: false,
      options: { temperature: 0.7, num_predict: OLLAMA_PERSONA_NUM_PREDICT },
    }),
    signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
  });
};

/** Upsert persona row for owner — mirrors mediAi ChatbotPersonaService.savePersona fields. */
const savePersona = async (params: {
  ownerUserId: string;
  businessInfo: ChatbotBusinessInfo;
  services: ChatbotPersonaService[];
  generatedPersona: string;
  whatsappNumber?: string | null;
  logoUrl?: string | null;
}): Promise<{ row: typeof chatbotPersonas.$inferSelect; created: boolean }> => {
  const { ownerUserId, businessInfo, services, generatedPersona, whatsappNumber, logoUrl } =
    params;
  const businessName = businessInfo.businessName || "";
  const businessType = businessInfo.businessType || "healthcare";
  const ownerName = businessInfo.ownerName || "";

  const existing = await db
    .select()
    .from(chatbotPersonas)
    .where(and(eq(chatbotPersonas.ownerUserId, ownerUserId), eq(chatbotPersonas.isActive, true)))
    .limit(1);

  if (existing.length) {
    const [row] = await db
      .update(chatbotPersonas)
      .set({
        businessName,
        businessType,
        ownerName,
        persona: generatedPersona,
        businessInfo,
        services,
        whatsappNumber: whatsappNumber ?? null,
        logoUrl: logoUrl ?? null,
        updatedAt: new Date(),
      })
      .where(eq(chatbotPersonas.id, existing[0].id))
      .returning();
    return { row, created: false };
  }

  const [row] = await db
    .insert(chatbotPersonas)
    .values({
      ownerUserId,
      businessName,
      businessType,
      ownerName,
      persona: generatedPersona,
      businessInfo,
      services,
      whatsappNumber: whatsappNumber ?? null,
      logoUrl: logoUrl ?? null,
      isActive: true,
    })
    .returning();
  return { row, created: true };
};

const mapHospitalCatalogToPersonaServices = (rows: Array<{
  serviceName: string;
  description: string | null;
  rate: string;
  durationMinutes: number;
  currency: string;
}>): ChatbotPersonaService[] =>
  rows.map((row) => ({
    serviceName: row.serviceName,
    description: row.description || "",
    price: Number(row.rate || 0),
    currency: (row.currency || "PKR").toUpperCase(),
    slotDuration: String(row.durationMinutes || 30),
    availabilitySlots: [],
  }));

const mapDoctorServicesToPersonaServices = (rows: Array<{
  serviceName: string;
  description: string | null;
  pricePkr: string;
  durationMinutes: number;
}>): ChatbotPersonaService[] =>
  rows.map((row) => ({
    serviceName: row.serviceName,
    description: row.description || "",
    price: Number(row.pricePkr || 0),
    currency: "PKR",
    slotDuration: String(row.durationMinutes || 30),
    availabilitySlots: [],
  }));

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
        const docRows = await db.select({ id: doctors.id }).from(doctors).where(eq(doctors.userId, userId)).limit(1);
        if (docRows[0]) {
          const privateAffiliation = await db
            .select({ id: doctorPracticeAffiliations.id })
            .from(doctorPracticeAffiliations)
            .where(
              and(
                eq(doctorPracticeAffiliations.doctorId, docRows[0].id),
                eq(doctorPracticeAffiliations.kind, "private"),
                eq(doctorPracticeAffiliations.status, "active"),
              ),
            )
            .limit(1);
          if (privateAffiliation[0]) {
            const privateServices = await db
              .select({
                serviceName: doctorServices.serviceName,
                description: doctorServices.description,
                pricePkr: doctorServices.pricePkr,
                durationMinutes: doctorServices.durationMinutes,
              })
              .from(doctorServices)
              .where(
                and(
                  eq(doctorServices.doctorId, docRows[0].id),
                  eq(doctorServices.practiceAffiliationId, privateAffiliation[0].id),
                  eq(doctorServices.isActive, true),
                ),
              );
            suggestedServices = mapDoctorServicesToPersonaServices(privateServices);
          }
        }
      } else if (role === UserRole.HOSPITAL) {
        const hospRows = await db
          .select({ id: hospitals.id })
          .from(hospitals)
          .where(eq(hospitals.userId, userId))
          .limit(1);
        if (hospRows[0]) {
          const catalog = await db
            .select({
              serviceName: hospitalServiceCatalog.serviceName,
              description: hospitalServiceCatalog.description,
              rate: hospitalServiceCatalog.rate,
              durationMinutes: hospitalServiceCatalog.durationMinutes,
              currency: hospitalServiceCatalog.currency,
            })
            .from(hospitalServiceCatalog)
            .where(and(eq(hospitalServiceCatalog.hospitalId, hospRows[0].id), eq(hospitalServiceCatalog.isActive, true)));
          suggestedServices = mapHospitalCatalogToPersonaServices(catalog);
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
      const businessInfo: ChatbotBusinessInfo =
        (b.businessInfo as ChatbotBusinessInfo) || {
          businessName: b.businessName,
          businessType: b.businessType || "healthcare",
          ownerName: b.ownerName,
          about: b.about,
          locations: b.locations,
          businessEmail: b.businessEmail,
          phoneNumber: b.phoneNumber,
        };

      const { row, created } = await savePersona({
        ownerUserId: userId,
        businessInfo,
        services,
        generatedPersona: b.persona as string,
        whatsappNumber: b.whatsappNumber || null,
        logoUrl: b.logoUrl || null,
      });

      return res
        .status(created ? 201 : 200)
        .json(ApiResponse(row, created ? "Created" : "Updated"));
    } catch (e) {
      next(e);
    }
  };

  private generatePersona = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.userId as string;
      const role = (req as any).user.role as string;
      const b = req.body || {};
      const businessInfo: ChatbotBusinessInfo = {
        businessName: (b.businessInfo?.businessName as string) || (b.businessName as string),
        businessType: (b.businessInfo?.businessType as string) || (b.businessType as string) || "healthcare",
        ownerName: (b.businessInfo?.ownerName as string) || (b.ownerName as string),
        about: (b.businessInfo?.about as string) || (b.about as string) || "",
        locations: (b.businessInfo?.locations as string[]) || (b.locations as string[]) || [],
        businessEmail: (b.businessInfo?.businessEmail as string) || (b.businessEmail as string) || "",
        phoneNumber: (b.businessInfo?.phoneNumber as string) || (b.phoneNumber as string) || "",
      };

      let services = (b.services as ChatbotPersonaService[]) || [];
      if (role === UserRole.DOCTOR && services.length === 0) {
        const docRows = await db.select({ id: doctors.id }).from(doctors).where(eq(doctors.userId, userId)).limit(1);
        if (!docRows.length) {
          return next(BadRequestError("Doctor profile not found"));
        }
        const privateAffiliation = await db
          .select({ id: doctorPracticeAffiliations.id })
          .from(doctorPracticeAffiliations)
          .where(
            and(
              eq(doctorPracticeAffiliations.doctorId, docRows[0].id),
              eq(doctorPracticeAffiliations.kind, "private"),
              eq(doctorPracticeAffiliations.status, "active"),
            ),
          )
          .limit(1);
        if (privateAffiliation[0]) {
          const privateServices = await db
            .select({
              serviceName: doctorServices.serviceName,
              description: doctorServices.description,
              pricePkr: doctorServices.pricePkr,
              durationMinutes: doctorServices.durationMinutes,
            })
            .from(doctorServices)
            .where(
              and(
                eq(doctorServices.doctorId, docRows[0].id),
                eq(doctorServices.practiceAffiliationId, privateAffiliation[0].id),
                eq(doctorServices.isActive, true),
              ),
            );
          services = mapDoctorServicesToPersonaServices(privateServices);
        }
      }
      if (role === UserRole.HOSPITAL) {
        const hospRows = await db
          .select({ id: hospitals.id })
          .from(hospitals)
          .where(eq(hospitals.userId, userId))
          .limit(1);
        if (!hospRows.length) {
          return next(BadRequestError("Hospital profile not found"));
        }
        const catalog = await db
          .select({
            serviceName: hospitalServiceCatalog.serviceName,
            description: hospitalServiceCatalog.description,
            rate: hospitalServiceCatalog.rate,
            durationMinutes: hospitalServiceCatalog.durationMinutes,
            currency: hospitalServiceCatalog.currency,
          })
          .from(hospitalServiceCatalog)
          .where(and(eq(hospitalServiceCatalog.hospitalId, hospRows[0].id), eq(hospitalServiceCatalog.isActive, true)));
        services = mapHospitalCatalogToPersonaServices(catalog);
      }
      const preferences = b.preferences as { chatbotTone?: string; language?: string } | undefined;
      const whatsappNumber = (b.whatsappNumber as string) || undefined;
      const businessName = businessInfo.businessName;
      const ownerName = businessInfo.ownerName;

      if (!businessName || !ownerName) {
        return next(BadRequestError("businessName and ownerName are required"));
      }

      const prompt = buildPersonaPrompt({
        businessInfo,
        services,
        whatsappNumber,
        preferences: preferences || null,
      });

      console.log(prompt, "prompt====>");

      let resOllama: globalThis.Response;
      let usedModel = OLLAMA_MODEL;
      try {
        resOllama = await requestOllamaPersona({ model: OLLAMA_MODEL, prompt });
      } catch (error) {
        const reason = error instanceof Error ? error.message : "unknown error";
        return next(
          BadRequestError(
            `Could not reach Ollama at ${OLLAMA_BASE_URL} (${reason}). Check Ollama server status and base URL.`
          )
        );
      }
      if (!resOllama.ok) {
        const errText = await resOllama.text();
        const isMissingModel =
          resOllama.status === 404 || /model .* not found/i.test(errText);
        if (isMissingModel && OLLAMA_FALLBACK_MODEL && OLLAMA_FALLBACK_MODEL !== OLLAMA_MODEL) {
          usedModel = OLLAMA_FALLBACK_MODEL;
          try {
            resOllama = await requestOllamaPersona({ model: OLLAMA_FALLBACK_MODEL, prompt });
          } catch (error) {
            const reason = error instanceof Error ? error.message : "unknown error";
            return next(
              BadRequestError(
                `Primary model '${OLLAMA_MODEL}' missing and fallback '${OLLAMA_FALLBACK_MODEL}' failed (${reason}).`
              )
            );
          }
          if (!resOllama.ok) {
            const fallbackErr = await resOllama.text();
            return next(BadRequestError(`Ollama request failed on fallback model: ${fallbackErr}`));
          }
        } else {
          return next(BadRequestError(`Ollama request failed: ${errText}`));
        }
      }

      let persona: string;
      try {
        persona = await parseOllamaChatResponse(resOllama);
      } catch (parseErr) {
        const msg = parseErr instanceof Error ? parseErr.message : "parse failed";
        return next(BadRequestError(`Could not read Ollama response: ${msg}`));
      }

      console.log(persona, "analysisData====>");

      let usedFallback = false;
      try {
        JSON.parse(persona);
      } catch {
        persona = createFallbackPersona(businessInfo, services);
        usedFallback = true;
      }

      return res
        .status(200)
        .json(
          ApiResponse(
            { persona, model: usedModel, usedFallback },
            usedFallback ? "Generated (fallback)" : "Generated"
          )
        );
    } catch (e) {
      next(e);
    }
  };

  getRouter() {
    return this.router;
  }
}
