import { Client } from "fhir-kit-client";
const FHIR_URL = process.env.FHIR_SERVER_URL || "https://hapi.fhir.org/baseR4";
const client = new Client({ baseUrl: FHIR_URL });
export async function encounterCheckIn(args) {
    const { appointmentId, patient_id } = args;
    try {
        const encounter = {
            resourceType: "Encounter",
            status: "arrived",
            class: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "AMB" },
            subject: { reference: `Patient/${patient_id}` },
            appointment: appointmentId ? [{ reference: `Appointment/${appointmentId}` }] : undefined
        };
        const response = await client.create({
            resourceType: "Encounter",
            body: encounter,
        });
        return { content: [{ type: "text", text: `Encounter created: ${response.id}` }] };
    }
    catch (error) {
        throw new Error(`FHIR Encounter Error: ${error}`);
    }
}
export async function assignRoom(args) {
    const { encounterId, locationId } = args;
    try {
        const encounter = await client.read({
            resourceType: "Encounter",
            id: encounterId
        });
        encounter.location = [{
                location: { reference: `Location/${locationId}` },
                status: "active"
            }];
        const response = await client.update({
            resourceType: "Encounter",
            id: encounterId,
            body: encounter,
        });
        return { content: [{ type: "text", text: `Room assigned to Encounter: ${response.id}` }] };
    }
    catch (error) {
        throw new Error(`FHIR Assign Room Error: ${error}`);
    }
}
//# sourceMappingURL=clinic_flow.js.map