// Usa o sistema de importação moderno (ESM)
import fetch from 'node-fetch';

// A chave da API será lida das variáveis de ambiente seguras do Netlify
const API_TOKEN = process.env.BRAPI_TOKEN;

export const handler = async (event) => {
  // Pega o 'ticker' que vem da URL
  const ticker = event.queryStringParameters.ticker;

  if (!ticker) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "O parâmetro 'ticker' é obrigatório." }),
    };
  }

  if (!API_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Chave da API não configurada no servidor." }),
    };
  }

  const url = `https://brapi.dev/api/quote/${ticker.toUpperCase()}?token=${API_TOKEN}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.results && data.results[0] && data.results[0].regularMarketPrice) {
      return {
        statusCode: 200,
        body: JSON.stringify({ price: data.results[0].regularMarketPrice }),
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `Cotação não encontrada para o ticker: ${ticker}` }),
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Erro ao comunicar com a API da Brapi: ${error.message}` }),
    };
  }
};
