export async function getAIRecommendation(req, res, userPrompt, products) {
  const API_KEY = process.env.GEMINI_API_KEY;
  const URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

  try {
    const geminiPrompt = `
        System: You are an expert e-commerce assistant. 
        User Request: "${userPrompt}"
        Available Products: ${JSON.stringify(products.map(p => ({ id: p.id, name: p.name, price: p.price, category: p.category, ratings: p.ratings, stock: p.stock })), null, 2)}

        Task: 
        1. Filter the products that best match the user's intent.
        2. Consider price mentions (e.g., "under 500", "cheap", "expensive").
        3. Consider quality mentions (e.g., "best rated", "top quality").
        4. Consider availability (e.g., "in stock").
        
        Return a JSON object with two fields:
        "products": an array of matching product objects (preserved with their original IDs).
        "filtersDetected": an object describing the filters you applied (e.g., { "Price": "Under 500", "Quality": "Best Rated" }).

        If no products match, return { "products": [], "filtersDetected": {} }.
    `;

    const response = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: geminiPrompt }] }],
      }),
    });

    const data = await response.json();
    const aiResponseText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    const cleanedText = aiResponseText.replace(/```json|```/g, ``).trim();

    if (!cleanedText) {
      return { success: true, products: [], filtersDetected: {} };
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(cleanedText);
    } catch (error) {
       console.error("AI Parse Error:", cleanedText);
       return { success: false, message: "Failed to parse AI response" };
    }
    return { 
      success: true, 
      products: parsedResponse.products || [], 
      filtersDetected: parsedResponse.filtersDetected || {} 
    };
  } catch (error) {
    console.error("AI Fetch Error:", error);
    return { success: false, message: "Internal server error." };
  }
}
