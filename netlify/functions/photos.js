const axios = require("axios");

exports.handler = async (event) => {
  try {
    const query = event.queryStringParameters?.query || "";
    if (!query.trim()) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing 'query' parameter" }),
      };
    }

    const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
    if (!UNSPLASH_ACCESS_KEY) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Server missing UNSPLASH_ACCESS_KEY" }),
      };
    }

    const response = await axios.get("https://api.unsplash.com/search/photos", {
      params: { query, per_page: 6 },
      headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(response.data),
    };
  } catch (error) {
    console.error("Netlify function photos error:", error?.message || error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Erro ao buscar imagens" }),
    };
  }
};
