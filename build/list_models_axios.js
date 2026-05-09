import dotenv from "dotenv";
import axios from "axios";
dotenv.config();
async function main() {
    const key = process.env.GOOGLE_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
    try {
        const response = await axios.get(url);
        console.log("Available Models:");
        response.data.models.forEach((m) => console.log(m.name));
    }
    catch (error) {
        console.error("Error listing models:", error.response?.data || error.message);
    }
}
main().catch(console.error);
//# sourceMappingURL=list_models_axios.js.map