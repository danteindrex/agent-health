import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";

import * as identity from "./tools/identity.js";
import * as scheduling from "./tools/scheduling.js";
import * as clinicFlow from "./tools/clinic_flow.js";
import * as communication from "./tools/communication.js";
import * as clinical from "./tools/clinical.js";

dotenv.config();

const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN;

function authMiddleware(req: any, res: any, next: any) {
  if (!MCP_AUTH_TOKEN) {
    res.status(503).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Server authentication not configured" },
      id: null,
    });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Missing Authorization header" },
      id: null,
    });
    return;
  }

  const [type, token] = authHeader.split(' ');
  if (type?.toLowerCase() !== 'bearer' || !token) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Invalid Authorization header format" },
      id: null,
    });
    return;
  }

  if (token !== MCP_AUTH_TOKEN) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Invalid authentication token" },
      id: null,
    });
    return;
  }

  req.auth = { clientId: 'authenticated-client', scopes: ['mcp:tools'] };
  next();
}

const TOOLS: any[] = [
  // Identity
  {
    name: "patient_upsert",
    description: "Create or update a Patient record in FHIR R4.",
    inputSchema: {
      type: "object",
      properties: {
        resource: { type: "object" },
        sharp_context: { type: "object", properties: { auth_token: { type: "string" }, patient_id: { type: "string" } } }
      },
      required: ["resource"]
    }
  },
  {
    name: "verify_identity",
    description: "2FA/OTP verification for patient identity.",
    inputSchema: {
      type: "object",
      properties: {
        phone: { type: "string" },
        otp: { type: "string" }
      },
      required: ["phone", "otp"]
    }
  },
  // Scheduling
  {
    name: "availability_query",
    description: "Search for available slots in the clinic.",
    inputSchema: {
      type: "object",
      properties: {
        location_id: { type: "string" },
        start: { type: "string" }
      }
    }
  },
  {
    name: "appointment_book",
    description: "Book an appointment for a patient.",
    inputSchema: {
      type: "object",
      properties: {
        slot_id: { type: "string" },
        patient_id: { type: "string" }
      },
      required: ["slot_id", "patient_id"]
    }
  },
  {
    name: "appointment_cancel",
    description: "Cancel an existing appointment.",
    inputSchema: {
      type: "object",
      properties: { appointment_id: { type: "string" } },
      required: ["appointment_id"]
    }
  },
  // Clinic Flow
  {
    name: "encounter_checkin",
    description: "Check in a patient for their appointment.",
    inputSchema: {
      type: "object",
      properties: {
        appointmentId: { type: "string" },
        patient_id: { type: "string" }
      },
      required: ["patient_id"]
    }
  },
  {
    name: "assign_room",
    description: "Assign a room to an active encounter.",
    inputSchema: {
      type: "object",
      properties: {
        encounterId: { type: "string" },
        locationId: { type: "string" }
      },
      required: ["encounterId", "locationId"]
    }
  },
  // Communication
  {
    name: "wa_template_dispatch",
    description: "Send a WhatsApp Business template message.",
    inputSchema: {
      type: "object",
      properties: {
        phone: { type: "string" },
        templateId: { type: "string" },
        parameters: { type: "array", items: { type: "string" } }
      },
      required: ["phone", "templateId"]
    }
  },
  {
    name: "wa_interactive_session",
    description: "Start an interactive WhatsApp session with buttons.",
    inputSchema: {
      type: "object",
      properties: {
        phone: { type: "string" },
        buttons: { type: "array", items: { type: "string" } },
        bodyText: { type: "string" }
      },
      required: ["phone", "buttons"]
    }
  },
  {
    name: "secure_email_send",
    description: "Send a secure, encrypted email to a patient.",
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string" },
        subject: { type: "string" },
        encryptedBody: { type: "string" }
      },
      required: ["to", "subject"]
    }
  },
  // Clinical
  {
    name: "observation_post",
    description: "Post a clinical observation (e.g., lab result) to FHIR.",
    inputSchema: {
      type: "object",
      properties: {
        observation: { type: "object" },
        patient_id: { type: "string" }
      },
      required: ["observation", "patient_id"]
    }
  },
  {
    name: "insurance_check",
    description: "Verify patient insurance coverage.",
    inputSchema: {
      type: "object",
      properties: { patient_id: { type: "string" } },
      required: ["patient_id"]
    }
  },
  {
    name: "log_audit_trail",
    description: "Log an agent action for compliance auditing.",
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string" },
        agentId: { type: "string" }
      },
      required: ["action"]
    }
  },
  {
    name: "clinic_analytics",
    description: "Get high-level clinic metrics for a specific date (e.g. appointment counts).",
    inputSchema: {
      type: "object",
      properties: {
        date: { type: "string", description: "ISO date string (YYYY-MM-DD)" }
      },
      required: ["date"]
    }
  },
  // HITL
  {
    name: "hitl_pause_trigger",
    description: "Trigger a human-in-the-loop workflow pause.",
    inputSchema: {
      type: "object",
      properties: {
        reason: { type: "string" },
        payload: { type: "object" }
      },
      required: ["reason"]
    }
  },
  {
    name: "hitl_review_poll",
    description: "Poll for the status of a pending HITL review.",
    inputSchema: {
      type: "object",
      properties: { taskId: { type: "string" } },
      required: ["taskId"]
    }
  }
];

function createServer() {
  const server = new Server(
    {
      name: "healthcare-automation-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "patient_upsert": return await identity.patientUpsert(args);
        case "verify_identity": return await identity.verifyIdentity(args);
        case "availability_query": return await scheduling.availabilityQuery(args);
        case "appointment_book": return await scheduling.appointmentBook(args);
        case "appointment_cancel": return await scheduling.appointmentCancel(args);
        case "encounter_checkin": return await clinicFlow.encounterCheckIn(args);
        case "assign_room": return await clinicFlow.assignRoom(args);
        case "wa_template_dispatch": return await communication.waTemplateDispatch(args);
        case "wa_interactive_session": return await communication.waInteractiveSession(args);
        case "secure_email_send": return await communication.secureEmailSend(args);
        case "observation_post": return await clinical.observationPost(args);
        case "insurance_check": return await clinical.insuranceCheck(args);
        case "log_audit_trail": return await clinical.logAuditTrail(args);
        case "clinic_analytics": return await clinical.clinicAnalytics(args);
        case "hitl_pause_trigger": return await clinical.hitlPauseTrigger(args);
        case "hitl_review_poll": return await clinical.hitlReviewPoll(args);
        default:
          throw new Error(`Tool not found: ${name}`);
      }
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  });

  return server;
}

async function run() {
  const PORT = process.env.PORT;
  
  if (PORT) {
    const app = express();
    app.use(express.json());
    const sseSessions = new Map<string, { transport: SSEServerTransport; server: Server }>();

    app.post("/mcp", authMiddleware, async (req: any, res: any) => {
      const server = createServer();

      try {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });

        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);

        res.on("close", () => {
          transport.close().catch(() => undefined);
          server.close().catch(() => undefined);
        });
      } catch (error) {
        console.error("Failed to handle Streamable HTTP request:", error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: "2.0",
            error: {
              code: -32603,
              message: "Internal server error",
            },
            id: null,
          });
        }
      }
    });

    app.get("/mcp", authMiddleware, (_req: any, res: any) => {
      res.status(405).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Method not allowed.",
        },
        id: null,
      });
    });

    app.delete("/mcp", authMiddleware, (_req: any, res: any) => {
      res.status(405).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Method not allowed.",
        },
        id: null,
      });
    });

    app.get("/sse", authMiddleware, async (req: any, res: any) => {
      const server = createServer();
      const transport = new SSEServerTransport("/messages", res);
      sseSessions.set(transport.sessionId, { transport, server });
      res.on("close", () => {
        sseSessions.delete(transport.sessionId);
        server.close().catch(() => undefined);
      });
      await server.connect(transport);
    });

    app.post("/messages", authMiddleware, async (req: any, res: any) => {
      const sessionId = String(req.query.sessionId || "");
      const session = sseSessions.get(sessionId);
      if (session) {
        await session.transport.handlePostMessage(req, res, req.body);
      } else {
        res.status(400).send("Session not initialized");
      }
    });

    const port = parseInt(PORT);
    app.listen(port, "0.0.0.0", () => {
      console.error(`Healthcare MCP Server running on Streamable HTTP at http://0.0.0.0:${port}/mcp`);
    });
    
  } else {
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Healthcare Automation MCP Server running on stdio");
  }
}

run().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
