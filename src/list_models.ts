import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
  // The SDK doesn't have a direct listModels, but we can try to find out
  console.log("Listing models is not directly supported in this SDK version easily without discovery.");
  console.log("Trying gemini-1.5-flash-latest and gemini-1.5-pro-latest...");
}

main().catch(console.error);
