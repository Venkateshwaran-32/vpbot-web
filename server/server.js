import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { systemPrompt } from "./system-prompt.js";
import { Chat, LMStudioClient } from "@lmstudio/sdk";

dotenv.config({ override: true });

const client = new LMStudioClient();
const model = await client.llm.model("google/gemma-3n-e4b");

const app = express();
const port = 3000;

function parseModelJson(rawText) {
    if (!rawText) {
        return null;
    }
    try {
        return JSON.parse(rawText);
    } catch (error) {
        const start = rawText.indexOf("{");
        const end = rawText.lastIndexOf("}");
        if (start !== -1 && end !== -1 && end > start) {
            const slice = rawText.slice(start, end + 1);
            try {
                return JSON.parse(slice);
            } catch (innerError) {
                return null;
            }
        }
        return null;
        }
    }

// Allow JSON request bodies
app.use(express.json());

// CORS: allow your front-end (Live Server) to call this API
app.use(
    cors({
        origin: "*", // for dev; can lock down later
  })
);

// Health check
app.get("/", (request, response) => {
    response.json({ status: "ok", service: "vpbot-backend-lmstudio-gemma3n-e4b" });
});

// // ----- MAIN CHAT ENDPOINT (TEXT ONLY) -----
app.post("/api/chat", async (request, response) => {
    try {
        const userText = (request.body?.text || "").trim();
        const currentTopicId = request.body?.current_topic_id || "16";
        if (!userText) {
          return response
            .status(400)
            .json({ error: "No 'text' field provided in JSON body." });
        }
        console.log("User said:", userText);

        const chat = Chat.from([
            { role: "system", content: systemPrompt + `Current Topic ID: ${currentTopicId}` },
            { role: "user", content: userText },
        ]);

        const model_response = await model.respond(chat);
        console.log(currentTopicId, model_response.content);

        const assistantText = model_response.content.trim() || "I could not generate a reply. Please try again.";

        // For now: no audio, just text
        response.json({
            assistantText,
        });
    } catch (error) {
        console.error("Error in /api/chat:", error);
        response.status(500).json({
            error: "Server error talking to VPbot (Gemma3n-e4b)",
            details: error.message || String(error),
        });
    }
});

// ----- ANSWER VERIFICATION ENDPOINT -----
app.post("/api/verify", async (request, response) => {
    try {
        const question = (request.body?.question || "").trim();
        const answerKey =
            (request.body?.answer_key || request.body?.answerKey || "").trim();
        const userAnswer =
            (request.body?.user_answer || request.body?.userAnswer || "").trim();
        const requiredPointsInput =
            request.body?.required_points || request.body?.requiredPoints || [];

        if (!question || !answerKey || !userAnswer) {
            return response.status(400).json({
            error:
                "Missing required fields. Provide question, answer_key, and user_answer.",
            });
        }

        const requiredPoints = Array.isArray(requiredPointsInput)
            ? requiredPointsInput.map((point) => String(point))
            : [String(requiredPointsInput)];
        const requiredPointsText = requiredPoints.length
            ? requiredPoints.map((point) => `- ${point}`).join("\n")
            : "- (none)";

        const userContent = [
            "QUESTION:",
            question,
            "",
            "ANSWER_KEY:",
            answerKey,
            "",
            "REQUIRED_POINTS:",
            requiredPointsText,
            "",
            "USER_ANSWER:",
            userAnswer,
        ].join("\n");

        const chat = Chat.from([
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
        ]);

        const modelResponse = await model.respond(chat);
        const parsed = parseModelJson(modelResponse?.content || "");

        if (!parsed) {
            return response.status(502).json({
                error: "Model returned invalid JSON.",
                raw: modelResponse?.content || "",
            });
        }

        return response.json({
            verdict: parsed.verdict || "INCORRECT",
            feedback: parsed.feedback || "",
            correct_answer: parsed.correct_answer || answerKey,
        });
    } catch (error) {
        console.error("Error in /api/verify:", error);
        return response.status(500).json({
            error: "Server error verifying answer",
            details: error.message || String(error),
        });
    }
});

app.listen(port, () => {
    console.log(`VPbot backend (Gemma3n-e4b) listening on http://localhost:${port}`);
});
