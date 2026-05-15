import axios from "axios";
import nodemailer from "nodemailer";
const WHAPI_TOKEN = process.env.WHAPI_TOKEN;
const WHAPI_URL = "https://gate.whapi.cloud/messages/text";
const ALLOW_DEMO_MOCKS = process.env.ALLOW_DEMO_MOCKS === "true";
const mailConfig = {
    host: process.env.SMTP_HOST || "smtp.example.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
};
const transporter = nodemailer.createTransport(mailConfig);
export async function waTemplateDispatch(args) {
    const { phone, templateId, parameters } = args;
    if (!WHAPI_TOKEN) {
        if (ALLOW_DEMO_MOCKS) {
            console.warn("WHAPI_TOKEN missing. Returning demo response.");
            return { content: [{ type: "text", text: `[DEMO] WA Template ${templateId} to ${phone}` }] };
        }
        throw new Error("WHAPI_TOKEN is not configured.");
    }
    try {
        const response = await axios.post(WHAPI_URL, {
            typing_time: 0,
            to: `${phone}@s.whatsapp.net`,
            body: `Template: ${templateId}. Params: ${parameters?.join(", ")}`,
        }, {
            headers: { Authorization: `Bearer ${WHAPI_TOKEN}` }
        });
        return { content: [{ type: "text", text: `WhatsApp message sent: ${response.data.message.id}` }] };
    }
    catch (error) {
        throw new Error(`WhatsApp API Error: ${error.response?.data?.message || error.message}`);
    }
}
export async function waInteractiveSession(args) {
    const { phone, buttons, bodyText } = args;
    if (!ALLOW_DEMO_MOCKS) {
        throw new Error("Interactive WhatsApp sessions are not implemented for production use. Set ALLOW_DEMO_MOCKS=true for demo responses or integrate a real provider.");
    }
    return {
        content: [{
                type: "text",
                text: `[DEMO] Interactive WhatsApp session (Buttons: ${buttons.join("/")}) started with ${phone}${bodyText ? `: ${bodyText}` : ""}`
            }]
    };
}
export async function secureEmailSend(args) {
    const { to, subject, encryptedBody } = args;
    try {
        const info = await transporter.sendMail({
            from: `"Clinic Orchestrator" <${process.env.SMTP_FROM || "no-reply@clinic.com"}>`,
            to,
            subject,
            text: encryptedBody,
            html: `<p>${encryptedBody}</p>`,
        });
        return { content: [{ type: "text", text: `Secure email sent: ${info.messageId}` }] };
    }
    catch (error) {
        if ((error.code === "ECONNREFUSED" || !process.env.SMTP_USER) && ALLOW_DEMO_MOCKS) {
            console.warn("SMTP not configured. Returning demo response.");
            return { content: [{ type: "text", text: `[DEMO] Email sent to ${to}` }] };
        }
        throw new Error(`Email Error: ${error.message}`);
    }
}
//# sourceMappingURL=communication.js.map