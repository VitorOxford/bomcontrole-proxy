require('dotenv').config(); // Carrega o .env local
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// Lê as variáveis de ambiente
const API_KEY = process.env.BOMCONTROLE_API_KEY;
const BASE_URL = 'https://apinewintegracao.bomcontrole.com.br/integracao';
// O Render usa a variável PORT ou 10000
const PORT = process.env.PORT || 10000;

if (!API_KEY) {
  console.error('ERRO: BOMCONTROLE_API_KEY não está definida.');
  process.exit(1); // Para o servidor se a key não for achada
}

// Configurações do Servidor
app.use(cors()); // Habilita o CORS para seu app Vue poder chamar
app.use(express.json()); // Habilita o parse de body JSON

// Rota "catch-all" do proxy
// Vai capturar TUDO: /Servico/Pesquisar, /Lead/Criar, etc.
app.all('*', async (req, res) => {
  const apiPath = req.path; // O caminho (ex: /Servico/Pesquisar)
  const targetUrl = `${BASE_URL}${apiPath}`;

  console.log(`[PROXY] Recebido: ${req.method} ${req.path}`);
  console.log(`[PROXY] Redirecionando para: ${targetUrl}`);

  try {
    // 1. Configura a chamada para o BomControle
    const config = {
      method: req.method,
      url: targetUrl,
      params: req.query, // Repassa query params (para GET)
      data: req.body,   // Repassa o body (para POST/PUT)
      headers: {
        // 2. INJETA A API KEY (Segura no servidor)
        'Authorization': `ApiKey ${API_KEY}`,
        'Content-Type': 'application/json',
      }
    };

    // 3. Faz a chamada real para a API
    const apiResponse = await axios(config);

    // 4. Retorna a resposta da API para o seu App Vue
    res.status(apiResponse.status).send(apiResponse.data);

  } catch (error) {
    // 5. Em caso de erro, retorna o erro
    console.error('[PROXY] Erro ao chamar API:', error.response ? error.response.data : error.message);
    const status = error.response ? error.response.status : 500;
    const data = error.response ? error.response.data : { message: error.message };
    res.status(status).send(data);
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Proxy BomControle rodando na porta ${PORT}`);
});