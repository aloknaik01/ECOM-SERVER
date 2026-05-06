/**
 * getAIRecommendation.js
 *
 * Phase 2 of the multilingual AI search pipeline.
 * Receives candidate products (already SQL-filtered by intent) and
 * uses Gemini to re-rank / further refine them based on the original
 * user prompt (which may be in any language).
 *
 * @param {string} userPrompt      - The original raw user query (any language)
 * @param {Array}  products        - Candidate products from the SQL query
 * @param {Object} intent          - Parsed intent from Phase 0 (parseUserIntent)
 */
export async function getAIRecommendation(userPrompt, products, intent = {}) {
  const API_KEY = process.env.GEMINI_API_KEY;
  const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

  const detectedLanguage = intent.detectedLanguage || "Unknown";
  const intentSummary = [
    intent.category     ? `Category: ${intent.category}`           : null,
    intent.maxPrice     ? `Max Price: ${intent.maxPrice}`          : null,
    intent.minPrice     ? `Min Price: ${intent.minPrice}`          : null,
    intent.minRatings   ? `Min Ratings: ${intent.minRatings}★`    : null,
    intent.availability ? `Availability: ${intent.availability}`   : null,
    intent.sortBy       ? `Sort By: ${intent.sortBy} (${intent.sortOrder || "desc"})` : null,
  ]
    .filter(Boolean)
    .join(", ");

  try {
    const geminiPrompt = `
You are a multilingual e-commerce search assistant.

The user wrote their query in: ${detectedLanguage}
Original User Query: "${userPrompt}"
Extracted Intent: ${intentSummary || "General search"}

Candidate Products (already pre-filtered from database):
${JSON.stringify(
  products.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    category: p.category,
    ratings: p.ratings,
    stock: p.stock,
  })),
  null,
  2
)}

Task:
1. Understand the user's intent from their original query (even if it is in Hindi, Hinglish, or another language).
2. From the candidate products, select only those that TRULY match the user's intent.
3. Apply any remaining filters the user mentioned (price ceiling, ratings, category, etc.).
4. Order the selected products by relevance to the query.

Return a JSON object with EXACTLY these two fields:
{
  "products": [ ...array of matching product objects with their original id, name, price, category, ratings, stock... ],
  "filtersDetected": { ...key-value description of filters applied, e.g. { "Language": "Hinglish", "Price": "Under ₹15000", "Category": "Mobile" }... }
}

If no products match, return: { "products": [], "filtersDetected": {} }
Return ONLY valid JSON. No markdown. No explanation.
`;

    const response = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: geminiPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
        },
      }),
    });

    const data = await response.json();
    const aiResponseText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    const cleanedText = aiResponseText.replace(/```json|```/g, "").trim();

    if (!cleanedText) {
      return { success: true, products: [], filtersDetected: {} };
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(cleanedText);
    } catch (error) {
      console.error("[getAIRecommendation] JSON parse error:", cleanedText);
      // Graceful fallback: return all candidates as-is
      return {
        success: true,
        products: products,
        filtersDetected: { Language: detectedLanguage },
      };
    }

    return {
      success: true,
      products: parsedResponse.products || [],
      filtersDetected: parsedResponse.filtersDetected || {},
    };
  } catch (error) {
    console.error("[getAIRecommendation] Fetch error:", error);
    return { success: false, message: "Internal server error." };
  }
}
