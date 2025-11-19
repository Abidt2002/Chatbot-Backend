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

// Load content file
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

// Initialize OpenAI client
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Function: get embeddings for a list of texts
async function getEmbeddings(texts) {
  const resp = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: texts
  });
  return resp.data.map(d => d.embedding);
}

// Cosine similarity
function cosineSim(vecA, vecB) {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (magA * magB + 1e-10);
}

// Main function
async function run() {
  try {
    // Get embeddings for content
    const contentEmbeddings = await getEmbeddings(content);

    // Get embedding for question
    const questionEmbedding = (await getEmbeddings([question]))[0];

    // Compute similarity scores
    const scored = content.map((line, idx) => ({
      line,
      score: cosineSim(questionEmbedding, contentEmbeddings[idx])
    }));

    // Pick top 5 most relevant lines
    const topMatches = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(m => m.line);

    // Fallback if no relevant lines
    const context = topMatches.length > 0 ? topMatches.join("\n") : content.slice(0, 3).join("\n");

    // Prepare system prompt
    const systemPrompt = `
You are Devbay AI Assistant.
Answer using ONLY this Devbay official website content:

${context}

If the user asks something not clearly in content, answer politely using general knowledge.
`;

    // Generate response
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


