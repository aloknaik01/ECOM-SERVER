/**
 * parseUserIntent.js
 *
 * Phase 0 of the multilingual AI search pipeline.
 * Sends the raw user prompt (any language) to Gemini and extracts
 * a structured search intent object so that the SQL query in Phase 1
 * can use real price ranges, category names, and English keywords.
 */

export async function parseUserIntent(userPrompt) {
  const API_KEY = process.env.GEMINI_API_KEY;
  const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

  const systemPrompt = `
You are a multilingual e-commerce search intent extractor.
The user may write in any language: English, Hindi, Hinglish (Hindi+English mix),
Tamil, Bengali, Marathi, Telugu, or any other language.

Your job is to analyze the user's search query and return a strict JSON object
with the following fields:

{
  "keywords": [array of relevant product keywords translated to English, max 5 words],
  "category": "the main product category in English, or null if not clear",
  "maxPrice": number or null (extract from phrases like 'under 15000', '15000 ke andar', '15000 से कम'),
  "minPrice": number or null (extract from phrases like 'above 5000', '5000 se upar'),
  "minRatings": number or null (extract from phrases like 'best rated', 'top quality', '4 star se upar'),
  "availability": "in-stock" or null (extract from phrases like 'available', 'in stock', 'jo milta ho'),
  "sortBy": "price" or "ratings" or "created_at" or null,
  "sortOrder": "asc" or "desc" or null,
  "detectedLanguage": "the language the query was written in (e.g. Hindi, Hinglish, English, Tamil)"
}

RULES:
1. keywords MUST be in English regardless of input language.
2. Extract numeric prices ONLY (ignore currency symbols). '15000' stays 15000, '15k' becomes 15000.
3. category must be one of these if it matches: Mobile, Laptop, Tablet, Headphones, Earphones,
   Camera, TV, Refrigerator, Washing Machine, AC, Clothing, Shoes, Books, Furniture, Toys,
   Skincare, Makeup, Watches, Jewellery, or null if none match.
4. If the user wants cheap/budget items, set sortBy: "price", sortOrder: "asc".
5. If the user wants best rated, set minRatings: 4, sortBy: "ratings", sortOrder: "desc".
6. Return ONLY valid JSON. No markdown. No explanation. No code blocks.

Examples:
- "15000 ke andar mobile phone dikhao" → {"keywords":["mobile","phone","smartphone"],"category":"Mobile","maxPrice":15000,"minPrice":null,"minRatings":null,"availability":null,"sortBy":"price","sortOrder":"asc","detectedLanguage":"Hinglish"}
- "सबसे अच्छे wireless headphones" → {"keywords":["wireless","headphones","earphones"],"category":"Headphones","maxPrice":null,"minPrice":null,"minRatings":4,"availability":null,"sortBy":"ratings","sortOrder":"desc","detectedLanguage":"Hindi"}
- "cheap laptops for students under 40000" → {"keywords":["laptop","student","budget"],"category":"Laptop","maxPrice":40000,"minPrice":null,"minRatings":null,"availability":null,"sortBy":"price","sortOrder":"asc","detectedLanguage":"English"}
- "best cameras above 20000" → {"keywords":["camera","photography","dslr"],"category":"Camera","maxPrice":null,"minPrice":20000,"minRatings":null,"availability":null,"sortBy":"ratings","sortOrder":"desc","detectedLanguage":"English"}

User Query: "${userPrompt}"
`;

  try {
    const response = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
        temperature: 0.2,
      },
      }),
    });

    const data = await response.json();
    const rawText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    // Strip any accidental markdown code fences
    const cleaned = rawText.replace(/```json|```/g, "").trim();

    if (!cleaned) {
      console.warn("[parseUserIntent] Empty response from Gemini. Full response:", JSON.stringify(data));
      return buildFallback(userPrompt);
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("[parseUserIntent] JSON parse error:", cleaned);
      return buildFallback(userPrompt);
    }

    // Sanitize: ensure keywords is always an array
    if (!Array.isArray(parsed.keywords)) {
      parsed.keywords = [];
    }

    return { success: true, intent: parsed };
  } catch (err) {
    console.error("[parseUserIntent] Fetch error:", err);
    return buildFallback(userPrompt);
  }
}

/**
 * Fallback: if Gemini fails, do a best-effort extraction from the raw prompt.
 * At minimum this extracts any numbers as potential price caps and uses
 * all non-stop words as English keywords.
 */
function buildFallback(userPrompt) {
  const englishStopWords = new Set([
    "the", "a", "an", "of", "and", "or", "to", "for", "in", "on",
    "by", "is", "are", "was", "were", "be", "this", "that", "it",
    "me", "my", "i", "we", "you", "he", "she", "they", "show",
    // Hinglish common words
    "ke", "ki", "ka", "ko", "se", "mujhe", "dikhao", "chahiye",
    "andar", "upar", "wala", "wale", "karo", "do",
  ]);

  const tokens = userPrompt
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w && !englishStopWords.has(w));

  // Try to find a price number
  const numbers = tokens
    .map((t) => parseInt(t, 10))
    .filter((n) => !isNaN(n) && n > 100);

  const keywords = tokens
    .filter((t) => isNaN(parseInt(t, 10)))
    .slice(0, 5);

  return {
    success: true,
    intent: {
      keywords: keywords.length > 0 ? keywords : [userPrompt.slice(0, 30)],
      category: null,
      maxPrice: numbers.length > 0 ? Math.min(...numbers) : null,
      minPrice: null,
      minRatings: null,
      availability: null,
      sortBy: null,
      sortOrder: null,
      detectedLanguage: "Unknown",
    },
  };
}
