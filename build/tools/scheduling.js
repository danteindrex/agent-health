import { Client } from "fhir-kit-client";
const FHIR_URL = process.env.FHIR_SERVER_URL || "https://hapi.fhir.org/baseR4";
const client = new Client({ baseUrl: FHIR_URL });
export async function availabilityQuery(args) {
    const { location_id, start } = args;
    // FHIR logic to search for Slots
    try {
        const searchParams = { status: "free" };
        if (location_id)
            searchParams["schedule.actor"] = `Location/${location_id}`;
        if (start)
            searchParams["start"] = `ge${start}`;
        const response = await client.search({
            resourceType: "Slot",
            searchParams,
        });
        return {
            content: [{
                    type: "text",
                    text: `Found ${response.total || 0} available slots.`
                }]
        };
    }
    catch (error) {
        throw new Error(`FHIR Search Error: ${error}`);
    }
}
export async function appointmentBook(args) {
    const { slot_id, patient_id } = args;
    try {
        const appointment = {
            resourceType: "Appointment",
            status: "booked",
            slot: [{ reference: `Slot/${slot_id}` }],
            participant: [{ actor: { reference: `Patient/${patient_id}` }, status: "accepted" }]
        };
        const response = await client.create({
            resourceType: "Appointment",
            body: appointment,
        });
        return { content: [{ type: "text", text: `Appointment booked: ${response.id}` }] };
    }
    catch (error) {
        throw new Error(`FHIR Booking Error: ${error}`);
    }
}
//# sourceMappingURL=scheduling.js.map