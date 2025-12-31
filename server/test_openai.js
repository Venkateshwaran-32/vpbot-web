import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config({ override: true });

console.log(
  "TEST - OPENAI_API_KEY prefix:",
  (process.env.OPENAI_API_KEY || "").slice(0, 15)
);

const client = new OpenAI();

async function runTest() {
  try {
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a test bot." },
        { role: "user", content: "Say 'VPbot connectivity OK'." },
      ],
    });

    console.log("Success! Model replied:");
    console.log(resp.choices[0].message.content);
  } catch (err) {
    console.error("Test chat error:", err);
  }
}

runTest();
