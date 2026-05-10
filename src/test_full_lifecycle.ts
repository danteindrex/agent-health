import { runClinicalTask } from "./agent_orchestrator.js";

async function runTest() {
  console.log("Starting Full Lifecycle Test...");
  
  const prompt = `
    1. Verify identity for patient '132024863' using token 'SECURE_TOKEN_99'.
    2. Check the patient in for their appointment today.
    3. Record a new observation: Blood Pressure 120/80.
    4. Send a WhatsApp message to the patient (phone: 555-0101) confirming their vitals have been recorded.
  `;

  try {
    const result = await runClinicalTask(prompt, `lifecycle-test-${Date.now()}`);
    console.log("\n--- TEST RESULT ---");
    console.log(result);
    console.log("-------------------\n");
  } catch (error) {
    console.error("Test Failed:", error);
  }
}

runTest();
