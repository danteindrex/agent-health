import { StateGraph, MessagesAnnotation, MemorySaver } from "@langchain/langgraph";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 1. Initialize Gemini
const model = new ChatGoogleGenerativeAI({
  model: "gemini-3-flash-preview",
  apiKey: process.env.GOOGLE_API_KEY,
});

// 2. Setup MCP Client Connection
const transport = new StdioClientTransport({
  command: "node",
  args: [join(__dirname, "../build/index.js")],
});

const mcpClient = new Client(
  { name: "orchestrator-client", version: "1.0.0" },
  { capabilities: {} }
);

await mcpClient.connect(transport);
const { tools: mcpTools } = await mcpClient.listTools();

import { tool } from "@langchain/core/tools";

// Map MCP tools to LangChain tools
const tools = mcpTools.map((t) => 
  tool(
    async (args: any) => {
      const result = await mcpClient.callTool({ name: t.name, arguments: args });
      return JSON.stringify(result);
    },
    {
      name: t.name,
      description: t.description,
      schema: t.inputSchema as any,
    }
  )
);

const toolNode = new ToolNode(tools as any);
const modelWithTools = model.bindTools(tools as any);

// 3. Define the Graph
const shouldContinue = (state: typeof MessagesAnnotation.State) => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1] as any;
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return "tools";
  }
  return "__end__";
};

const callModel = async (state: typeof MessagesAnnotation.State) => {
  const { messages } = state;
  const response = await modelWithTools.invoke(messages);
  return { messages: [response] };
};

const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent");

// 4. Persistence
const checkpointer = new MemorySaver();

export const app = workflow.compile({ checkpointer });

// 5. Test Function
export async function runClinicalTask(task: string, threadId: string = "patient-session-1") {
  const config = { configurable: { thread_id: threadId } };
  const result = await app.invoke({ messages: [{ role: "user", content: task }] }, config);
  return result.messages[result.messages.length - 1].content;
}

// If run directly, execute a test
if (process.argv[1] === __filename) {
    console.log("Running Clinical Orchestration Test...");
    runClinicalTask("Register patient Jane Smith, check her insurance, and if valid, book her for a checkup.")
        .then(res => console.log("Agent Result:", res))
        .catch(err => console.error("Test Error:", err));
}
