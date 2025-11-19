// Chatbot Backend: server.js
import fs from "fs";
import path from "path";
import OpenAI from "openai";

// Get user question from GitHub Action
const question = process.argv[2] || "";

if (!question) {
  process.stdout.write("⚠️ Error: No question provided.");
  process.exit(1);
}

// Load content file safely
const contentPath = path.join(process.cwd(), "api/data/devbay_content.txt");
let content = [];
try {
  content = fs.readFileSync(contentPath, "utf-8")
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0);
} catch (err) {
  console.error("Failed to read content file:", err);
  process.stdout.write("⚠️ Error: Unable to load content.");
  process.exit(1);
}

// Simple semantic similarity
function similarity(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  let score = 0;
  a.split(" ").forEach(word => { if (b.includes(word)) score++; });
  return score;
}

// Find top 5 matches
const matches = content
  .map(line => ({ line, score: similarity(question, line) }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 5)
  .filter(m => m.score > 0)
  .map(m => m.line);

const context = matches.length ? matches.join("\n") : "NO_RELEVANT_DATA";

// Prepare system prompt
const systemPrompt = context === "NO_RELEVANT_DATA"
  ? `You are Devbay AI Assistant.\nUser question is NOT related to Devbay content. Answer politely and helpfully.`
  : `You are Devbay AI Assistant.\nAnswer using ONLY this Devbay website content:\n\n${context}\nIf unclear, answer with general knowledge.`;

// Initialize OpenAI
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Run OpenAI completion
async function run() {
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ]
    });

    const answer = completion.choices[0]?.message?.content || "No response generated.";
    process.stdout.write(answer);

  } catch (err) {
    console.error("OpenAI error:", err);
    process.stdout.write("⚠️ Error: Unable to generate response.");
  }
}

run();


