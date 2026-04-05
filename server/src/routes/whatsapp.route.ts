import { Router, Request, Response, NextFunction } from "express";
import { whatsappWebhookService } from "../services/whatsappWebhook.service";

const router = Router();

const verifyWebhook = (req: Request, res: Response) => {
  console.log("Whatsapp webhook verification received");
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (mode === "subscribe" && token && expected && token === expected && typeof challenge === "string") {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

const handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("Whatsapp webhook received");
    const body = req.body;
    if (body?.object === "whatsapp_business_account" && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        for (const change of entry.changes || []) {
          if (change.field === "smb_message_echoes" && change.value?.message_echoes) {
            const phoneNumberId = change.value.metadata?.phone_number_id;
            for (const echo of change.value.message_echoes) {
              const text = echo.text?.body || "";
              await whatsappWebhookService.processHumanEcho(
                phoneNumberId,
                echo.from,
                echo.to,
                text
              );
            }
          }
          if (change.value?.messages && change.value.metadata?.phone_number_id) {
            const phoneNumberId = change.value.metadata.phone_number_id;
            for (const message of change.value.messages) {
              if (message.type === "text") {
                const text = message.text?.body || "";
                await whatsappWebhookService.processIncomingText(phoneNumberId, message.from, text);
              }
            }
          }
        }
      }
    }
    res.status(200).json({ status: "ok" });
  } catch (e) {
    next(e);
  }
};

router.get("/webhook", verifyWebhook);
router.post("/webhook", handleWebhook);

export const whatsappRouter = router;
