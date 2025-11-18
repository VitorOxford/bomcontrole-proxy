require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

// Configuração
const API_KEY = process.env.BOMCONTROLE_API_KEY;
const BASE_URL = 'https://apinewintegracao.bomcontrole.com.br/integracao';
const PORT = process.env.PORT || 10000;

// Validação Inicial
if (!API_KEY) {
  console.error('############################################################');
  console.error('## [PROXY ERRO FATAL] BOMCONTROLE_API_KEY não definida!   ##');
  console.error('############################################################');
  process.exit(1);
} else {
  console.log(`[PROXY INICIALIZADO] API Key carregada (termina com: ...${API_KEY.slice(-6)})`);
}

app.use(cors());
// Aumenta o limite do body para evitar problemas com payloads grandes
app.use(express.json({ limit: '10mb' }));

// Middleware de Log e Catch-All
app.use(async (req, res) => {
  const apiPath = req.path;
  const targetUrl = `${BASE_URL}${apiPath}`;
  const requestId = Math.random().toString(36).substring(7); // ID para rastrear logs

  console.log(`\n========== [REQ ${requestId}] INÍCIO ==========`);
  console.log(`[REQ ${requestId}] Timestamp: ${new Date().toISOString()}`);
  console.log(`[REQ ${requestId}] Caminho: ${req.path}`);
  console.log(`[REQ ${requestId}] Método: ${req.method}`);
  console.log(`[REQ ${requestId}] Query Params:`, JSON.stringify(req.query, null, 2));

  // Monta a configuração da chamada ao BomControle
  const config = {
    method: req.method,
    url: targetUrl,
    params: req.query,
    data: req.body,
    headers: {
      'Authorization': `ApiKey ${API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    timeout: 25000, // Aumentado para 25s (BomControle pode ser lento)
    validateStatus: () => true // Permite capturar qualquer status code (mesmo erros)
  };

  console.log(`[REQ ${requestId}] URL Destino: ${config.url}`);
  // Log do Body com formatação segura (evita erro circular se houver)
  try {
    console.log(`[REQ ${requestId}] Body Enviado:`, JSON.stringify(config.data, null, 2));
  } catch (e) {
    console.log(`[REQ ${requestId}] Body Enviado (Raw):`, config.data);
  }
  console.log('------------------------------------------------------------');

  try {
    // --- EXECUTA A CHAMADA ---
    const apiResponse = await axios(config);

    console.log(`[RES ${requestId}] Status Retornado: ${apiResponse.status} ${apiResponse.statusText}`);
    console.log(`[RES ${requestId}] Headers Retornados:`, JSON.stringify(apiResponse.headers, null, 2));

    // Log agressivo do corpo da resposta
    if (apiResponse.data) {
      try {
        const responseBody = JSON.stringify(apiResponse.data, null, 2);
        console.log(`[RES ${requestId}] Body Resposta:`, responseBody);
      } catch (e) {
        console.log(`[RES ${requestId}] Body Resposta (Não-JSON):`, apiResponse.data);
      }
    } else {
      console.log(`[RES ${requestId}] Body Resposta: <VAZIO>`);
    }

    // Repassa a resposta exata do BomControle para o Frontend
    res.status(apiResponse.status).send(apiResponse.data);

  } catch (error) {
    // Erros de rede/axios que não retornaram resposta do servidor (timeout, DNS, etc)
    console.error(`\n########## [ERRO ${requestId}] FALHA NA REQUISIÇÃO ##########`);
    console.error(`[ERRO ${requestId}] Mensagem: ${error.message}`);
    
    if (error.code) {
      console.error(`[ERRO ${requestId}] Código: ${error.code}`);
    }
    
    if (error.response) {
      // Isso teoricamente é capturado pelo validateStatus, mas por segurança:
      console.error(`[ERRO ${requestId}] Servidor respondeu com erro!`);
      console.error(`[ERRO ${requestId}] Status: ${error.response.status}`);
      console.error(`[ERRO ${requestId}] Dados:`, JSON.stringify(error.response.data, null, 2));
    }

    console.error('############################################################');

    // Retorna erro genérico de Gateway para o cliente
    res.status(502).json({
      status: 'error',
      message: 'Falha na comunicação com o BomControle (Proxy Error)',
      details: error.message,
      code: error.code
    });
  } finally {
    console.log(`========== [REQ ${requestId}] FIM ==========\n`);
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Proxy BomControle rodando na porta ${PORT}`);
  console.log(`Target Base URL: ${BASE_URL}`);
});
