import { GoogleGenerativeAI } from "@google/generative-ai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  // 1. Initialize Gemini
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

  // 2. Connect to the MCP Server
  const transport = new StdioClientTransport({
    command: "node",
    args: [join(__dirname, "../build/index.js")],
  });

  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log("Connected to MCP Server");

  // 3. List tools to provide to Gemini
  const { tools } = await client.listTools();
  
  // Convert MCP tools to Gemini function declarations
  const toolsForGemini = tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
  }));

  // 4. Start a chat session with tool usage
  const chat = model.startChat({
    tools: [{ functionDeclarations: toolsForGemini as any }],
  });

  const prompt = "Register a new patient named 'John Doe' with phone '555-0199', then check if there are any available slots for today.";
  console.log(`Prompt: ${prompt}`);

  let result = await chat.sendMessage(prompt);
  let response = result.response;

  // 5. Handle function calls
  while (response.candidates![0].content.parts.some(part => part.functionCall)) {
    const functionCalls = response.candidates![0].content.parts
      .filter(part => part.functionCall)
      .map(part => part.functionCall!);

    const toolResponses = [];

    for (const call of functionCalls) {
      console.log(`Calling tool: ${call.name} with args:`, call.args);
      const toolResult = await client.callTool({
        name: call.name,
        arguments: call.args as any,
      });
      
      toolResponses.push({
        functionResponse: {
          name: call.name,
          response: toolResult,
        },
      });
    }

    // Send tool results back to Gemini
    result = await chat.sendMessage(toolResponses);
    response = result.response;
  }

  console.log("Gemini Response:", response.text());

  await client.close();
}

main().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
