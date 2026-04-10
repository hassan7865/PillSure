const GRAPH_VERSION = process.env.META_WHATSAPP_API_VERSION || "v21.0";

export type GraphSendResult = { success: true } | { success: false; error: string };

export const formatWhatsAppRecipient = (raw: string): string => {
  const digits = raw.replace(/\D/g, "");
  return digits;
};

export const sendWhatsAppTextMessage = async (params: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  body: string;
}): Promise<GraphSendResult> => {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${params.phoneNumberId}/messages`;
  const to = formatWhatsAppRecipient(params.to);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: params.body },
      }),
    });
    const data = (await res.json()) as { error?: { message?: string } };
    if (!res.ok) {
      return {
        success: false,
        error: data.error?.message || `HTTP ${res.status}`,
      };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "Network error" };
  }
};
