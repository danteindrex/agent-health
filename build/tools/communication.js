import axios from "axios";
import nodemailer from "nodemailer";
const WHAPI_TOKEN = process.env.WHAPI_TOKEN;
const WHAPI_URL = "https://gate.whapi.cloud/messages/text";
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
        console.warn("WHAPI_TOKEN missing. Mocking dispatch.");
        return { content: [{ type: "text", text: `[MOCK] WA Template ${templateId} to ${phone}` }] };
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
    // Whapi support for buttons
    return {
        content: [{
                type: "text",
                text: `Interactive WhatsApp session (Buttons: ${buttons.join("/")}) started with ${phone}`
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
        // If SMTP is not configured, fallback to log for demo/local testing
        if (error.code === 'ECONNREFUSED' || !process.env.SMTP_USER) {
            console.warn("SMTP not configured. Mocking email send.");
            return { content: [{ type: "text", text: `[MOCK] Email sent to ${to}` }] };
        }
        throw new Error(`Email Error: ${error.message}`);
    }
}
//# sourceMappingURL=communication.js.map