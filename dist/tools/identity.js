import axios from "axios";
import { Client } from "fhir-kit-client";
const FHIR_URL = process.env.FHIR_SERVER_URL || "https://hapi.fhir.org/baseR4";
const client = new Client({ baseUrl: FHIR_URL });
export async function patientUpsert(args) {
    const { resource, sharp_context } = args;
    // FHIR logic to create/update patient
    try {
        if (resource.id) {
            const response = await client.update({
                resourceType: "Patient",
                id: resource.id,
                body: resource,
            });
            return { content: [{ type: "text", text: `Updated Patient: ${response.id}` }] };
        }
        else {
            const response = await client.create({
                resourceType: "Patient",
                body: resource,
            });
            return { content: [{ type: "text", text: `Created Patient: ${response.id}` }] };
        }
    }
    catch (error) {
        throw new Error(`FHIR Error: ${error}`);
    }
}
export async function verifyIdentity(args) {
    const { phone, otp } = args;
    if (!phone || !otp) {
        return {
            content: [{ type: "text", text: "Phone and OTP are required" }],
            isError: true,
        };
    }
    const OTP_SERVICE_URL = process.env.OTP_SERVICE_URL;
    const OTP_SERVICE_API_KEY = process.env.OTP_SERVICE_API_KEY;
    if (!OTP_SERVICE_URL || !OTP_SERVICE_API_KEY) {
        throw new Error("OTP service not configured. Set OTP_SERVICE_URL and OTP_SERVICE_API_KEY environment variables.");
    }
    const response = await axios.post(`${OTP_SERVICE_URL}/verify`, { phone, otp }, { headers: { Authorization: `Bearer ${OTP_SERVICE_API_KEY}` } });
    if (response.data.valid) {
        return { content: [{ type: "text", text: "Identity Verified" }] };
    }
    return { content: [{ type: "text", text: "Invalid OTP" }], isError: true };
}
//# sourceMappingURL=identity.js.map