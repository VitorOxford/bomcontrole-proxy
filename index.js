require('dotenv').config(); 
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

const API_KEY = process.env.BOMCONTROLE_API_KEY;
const BASE_URL = 'https://apinewintegracao.bomcontrole.com.br/integracao';
const PORT = process.env.PORT || 10000;

if (!API_KEY) {
  console.error('ERRO: BOMCONTROLE_API_KEY não está definida.');
  process.exit(1); 
}

app.use(cors()); 
app.use(express.json()); 

// Middleware "catch-all" (simples)
app.use(async (req, res) => {
  const apiPath = req.path;
  const targetUrl = `${BASE_URL}${apiPath}`;

  console.log(`[PROXY] Recebido: ${req.method} ${req.path}`);
  console.log(`[PROXY] Redirecionando para: ${targetUrl}`);

  try {
    const config = {
      method: req.method,
      url: targetUrl,
      params: req.query, // Repassa os params que o app Vue enviar
      data: req.body,   
      headers: {
        'Authorization': `ApiKey ${API_KEY}`,
        'Content-Type': 'application/json',
      }
    };

    const apiResponse = await axios(config);
    
    // Log da resposta (para debug futuro)
    console.log(`[PROXY] Resposta da API (${apiPath}):`, JSON.stringify(apiResponse.data, null, 2));

    res.status(apiResponse.status).send(apiResponse.data);

  } catch (error) {
    console.error('[PROXY] Erro ao chamar API:', error.response ? error.response.data : error.message);
    const status = error.response ? error.response.status : 500;
    const data = error.response ? error.response.data : { message: error.message };
    res.status(status).send(data);
  }
});

app.listen(PORT, () => {
  console.log(`Proxy BomControle rodando na porta ${PORT}`);
});