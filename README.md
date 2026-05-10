# Healthcare "Endgame" Orchestrator
### Enterprise Clinical Automation via MCP & LangGraph

The Healthcare "Endgame" Orchestrator is a state-of-the-art automation system designed for the "Agents Assemble" challenge. It bridges the gap between passive FHIR data stores and active patient care through a multi-agent orchestration layer.

## 🚀 Key Features
- **16 FHIR-Native Tools:** Comprehensive coverage from Identity to Clinic Flow and Clinical Analytics.
- **SHARP Protocol:** Integrated security context and identity verification.
- **Agentic Brain:** Powered by Google Gemini 3 Flash and LangGraph for complex, multi-step clinical reasoning.
- **Production Ready:** Built-in Audit Trails, Secure Email (Nodemailer), and WhatsApp (Whapi) logic.

## 🛠 Architecture
- **Server:** Node.js (ESM), TypeScript, @modelcontextprotocol/sdk.
- **Orchestration:** LangGraph (Stateful persistence).
- **Standards:** HL7 FHIR R4.
- **Deployment:** Docker & Docker Compose.

## 📋 The 16 Tools
1. **Identity:** `patient_upsert`, `verify_identity`.
2. **Scheduling:** `availability_query`, `appointment_book`, `appointment_cancel`.
3. **Clinic Flow:** `encounter_checkin`, `assign_room`.
4. **Communication:** `wa_template_dispatch`, `wa_interactive_session`, `secure_email_send`.
5. **Clinical:** `observation_post`, `insurance_check`, `clinic_analytics`.
6. **Compliance:** `log_audit_trail`.
7. **HITL:** `hitl_pause_trigger`, `hitl_review_poll`.

## 🚦 Quick Start
1. **Clone & Install:**
   ```bash
   npm install
   ```
2. **Environment:**
   Add your `GOOGLE_API_KEY` to a `.env` file.
3. **Run with Docker (Recommended):**
   ```bash
   docker-compose up
   ```
4. **Test the Agent:**
   ```bash
   npx tsx src/test_full_lifecycle.ts
   ```

## 🔐 Compliance
Every tool call automatically generates a FHIR `AuditEvent`, ensuring a HIPAA/GDPR ready audit trail of all agent actions.
