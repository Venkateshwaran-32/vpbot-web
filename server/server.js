import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { systemPrompt } from "./system-prompt.js";
import { Chat, LMStudioClient } from "@lmstudio/sdk";
// import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config({ override: true });

const client = new LMStudioClient();
const model = await client.llm.model("google/gemma-3n-e4b");
// Debug: show which key is being used (only first part, safe)
// console.log(
  // "GEMINI_API_KEY prefix used by server:",
  // (process.env.GEMINI_API_KEY || "").slice(0, 15)
// );

// if (!process.env.GEMINI_API_KEY) {
  // console.error("ERROR: GEMINI_API_KEY not set in .env");
  // process.exit(1);
// }

// Initialise Gemini client
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use a good, cheap model (fine for VPbot)
// const model = genAI.getGenerativeModel({
  // model: "gemini-2.5-flash", // if this ever errors, we can switch to another variant
// });

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

        // const assistantText = (response.text && response.text().trim()) || "I could not generate a reply. Please try again.";
        const assistantText = model_response.content || "I could not generate a reply. Please try again.";

        // console.log("VPbot reply:", assistantText);

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
// app.post("/api/chat", async (req, res) => {
//   try {
//     const userText = (req.body?.text || "").trim();
//     const currentTopicId = req.body?.current_topic_id || "16";
//     if (!userText) {
//       return res
//         .status(400)
//         .json({ error: "No 'text' field provided in JSON body." });
//     }

//     console.log("User said:", userText);

//     const systemPrompt = `
// You are VPbot, a strict Voice Procedure quiz grader.

// SCOPE
// - Use ONLY the “REFERENCE” content provided in the current request (topic rules + answer key).
// - The "REFERENCE" content will be split into chapters. Each message from the student will provide a chapter number in the format: "Current Topic ID: <num>" where <num> is the chapter number.
// - The "REFERENCE" content will consist of all chapters up to the chapter number, including prerequisites provided before chapter 1.
// - If the user asks something not in the "REFERENCE" content, respond exactly:
//   “Not covered in the provided training content.”
// - The "REFERENCE" content is as follows, in JSON format, following the key-value pairs in the form { <num>: content }. Pronunciations for some words will be provided in (parentheses), otherwise the pronunciation will be the same as it is written in plain English. Additional information will be provided in [square parentheses].
//   {
//     Prerequisites: {
//       NUMBERS
//         Pronuncations for all digits are the same except for 9, with pronuncation "niner"
//         For numbers with multiple digits, each digit is read separately. [example: 10 (one zero), 93 (niner three)]

//       CALLSIGNS
//         Unique identifier for radio stations
//     },
//     1: {
//       INIIATE CALL
//         How to open a call on net and identify both stations using standard prowords.

//       PROWORDS
//         HULLO: initiate a new call.
//         MESSAGE: alert users to be ready for a new message.
//         WILCO: will comply after receiving instruction.
//         ROGER: received all of the last transmission.
//         OVER: finished talking, waiting for reply.
//         OUT: finished talking, end of transmission.

//       BASIC CALL STRUCTURE
//       Standard initiator format: HULLO <target callsign>, this is <own callsign>, MESSAGE, OVER.
//         SINGLE CALL: one target station only.
//           Example: HULLO 00 (zero zero), this is 10 (one zero), MESSAGE, OVER.
//         MULTIPLE CALL: multiple target stations, include AND in between stations.
//           Example: HULLO 20 (two zero) and 30 (three zero) and 40 (four zero),  this is 10 (one zero), MESSAGE, OVER.
//         COLLECTIVE CALL: targets all stations in a group determined beforehand.
//           Example: HULLO CHARLIE CHARLIE BRAVO [group callsign], this is 10 (one zero), MESSAGE, OVER.
//         ALL STATIONS CALL: calls all stations in a radio net.
//           Example: HULLO all stations DELTA FOXTROT [radio net identification sign], this is 10 (one zero), MESSAGE, OVER.

//       COMMON PITFALLS
//         Forgetting to say MESSAGE when starting a call.
//         Using OVER when one actually means to end the call [OUT].
//         Not using AND bewteen stations in a multiple call.
//         Confusing between collective calls, all-stations calls and single calls.
//     },
//     2: {
//       ANSWER CALL
//         How to answer a call correctly and terminate it clearly.

//       PROWORDS
//         SEND: signal to be ready to receive the message.
//         WAIT: ask the other stations to wait for less than 5 seconds.
//         WAIT OUT: ask the other stations to wait for more than 5 seconds, after which the call must be reinitiated with the method in chapter 1.

//       BASIC ANSWER STRUCTURE
//         Answer a call with your own callsign first: <own callsign>, SEND, OVER.
//         Example: 00, SEND, OVER.

//       HOLDING AND ENDING THE CALL:
//         If you have received the message: use ROGER
//         Example: 00, ROGER, OVER. / 00, ROGER, OUT.

//         If you have received the message and will comply: use WILCO:
//         Example: 00, WILCO, OVER. / 00, WILCO, OUT.

//         If you need time and require the other station to wait,
//           for less than 5 seconds: use WAIT.
//           Example: 00, WAIT... ROGER, OVER / OUT.

//           for more than 5 seconds: use WAIT OUT and reinitiate the call.
//           Example: 00, WAIT OUT. ... HULLO 10, this is 00, ROGER, OVER

//       GUIDELINE
//         Generally, the station who initiated the call terminates it with OUT.

//       COMMON PITFALLS:
//         Not starting with your own callsign.
//         Using WAIT but then delaying for longer than 5 seconds.
//         Using WAIT OUT but forgetting to re-initiate the call later.
//         Ending with OVER when no further reply is expected. [should end with OUT instead]
//     },
//     3: {
//       RADIO CHECK AND SIGNAL STRENGTH
//         Checking communications [comms] and describing signal strength and reliability.

//       PROWORDS
//         RADIO CHECK:
//         SIGNAL STRENGTH:
//         OK:
//         DIFFICULT:
//         NOTHING HEARD:
//         INTERFERENCE:
//         DISTORTION:
//         INTERMITTENT / INTERMITTENCE:

//       RADIO CHECK STRUCTURE
//         HULLO <station / collective group / radio net>, this is <own callsign>, RADIO CHECK, OVER.
//         Example: HULLO all stations AB [all stations call], this is 00, RADIO CHECK, OVER.

//       RADIO CHECK REPLY STRUCTURE
//         Each station replies with: <own callsign>, OK / DIFFICULT with <INTERFERENCE / DISTORTION / INTERMITTENCE>, OVER.
//     },
//     4: { hi

//     },
//     5: {

//     },
//     6: {

//     },
//     7: {

//     },
//     8: {

//     },
//     9: {

//     },
//     10: {

//     },
//     11: {

//     },
//     12: {

//     },
//     13: {

//     },
//     14: {

//     },
//     15: {

//     },
//     16: {

//     }
//   }

// GRADING GOAL
// - Determine whether the user’s answer matches the expected answer for the current quiz question.

// GRADING RULES
// - Be strict about required prowords, required order, and required key phrases.
// - Ignore minor differences in punctuation, spacing, or letter case. Ignore the spelling of HULLO as HELLO and captilization of all words.
// - If a transmission is required, accept equivalent formatting ONLY if it contains the same required components in the correct order.
// - Do NOT invent extra doctrine or alternative formats.

// OUTPUT FORMAT (always)
// Correct or Incorrect
// If Incorrect:
// - You are missing the words <items>
// - You have wrong or extra words, <items>
// - The correct answer is <provide the expected answer exactly>
// - Reason: <short one-line reason referencing REFERENCE>
// Then ask: “Try again.”

// Do not provide the answer unless the user has attempted and is incorrect, or the user explicitly asks to reveal it.
// Spell out the full pronuniciation of all digits in capital.
// No scoring points. No long explanations.

// `;

//     // Build a simple prompt that includes our "system" instructions
//     const prompt = `${systemPrompt}
// Current Topic ID: ${currentTopicId}
// Student: ${userText}
// VPbot:`;

//     const result = await model.generateContent(prompt);
//     const response = result.response;
//     const assistantText =
//       (response.text && response.text().trim()) ||
//       "I could not generate a reply. Please try again.";

//     console.log("VPbot reply:", assistantText);

//     // For now: no audio, just text
//     res.json({
//       assistantText,
//     });
//   } catch (err) {
//     console.error("Error in /api/chat:", err);

//     res.status(500).json({
//       error: "Server error talking to VPbot (Gemini)",
//       details: err.message || String(err),
//     });
//   }
// });

// ----- START SERVER -----
app.listen(port, () => {
    console.log(`VPbot backend (Gemma3n-e4b) listening on http://localhost:${port}`);
});
