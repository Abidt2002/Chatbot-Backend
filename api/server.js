import fs from "fs";
import OpenAI from "openai";

// Load content file
const content = fs.readFileSync("./data/devbay_content.txt", "utf-8")
  .split("\n")
  .filter(line => line.trim().length > 0);

// User question from GitHub Action
const question = process.argv[2];

// Simple semantic similarity
function similarity(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  let score = 0;
  a.split(" ").forEach(word => {
    if (b.includes(word)) score++;
  });
  return score;
}

// Find best 5 matching lines
const matches = content
  .map(line => ({ line, score: similarity(question, line) }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 5)
  .filter(m => m.score > 0)
  .map(m => m.line);

let context = matches.length ? matches.join("\n") : "NO_RELEVANT_DATA";

// Prepare prompt
let systemPrompt = "";

if (context === "NO_RELEVANT_DATA") {
  systemPrompt = `
You are Devbay AI Assistant.
User question is NOT related to Devbay website content.
Answer normally in helpful polite way.
  `;
} else {
  systemPrompt = `
You are Devbay AI Assistant.
Answer using ONLY this Devbay official website content:

${context}

If the user asks something not clearly in content, answer using general knowledge.
  `;
}

// Call OpenAI
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function run() {
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: question }
    ]
  });

  const answer = completion.choices[0].message.content;
  console.log(answer);
}

run();
