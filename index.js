require('dotenv').config(); 
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();

const API_KEY = process.env.BOMCONTROLE_API_KEY;
const BASE_URL = 'https://apinewintegracao.bomcontrole.com.br/integracao';
const PORT = process.env.PORT || 10000;

if (!API_KEY) {
  console.error('############################################################');
  console.error('## [PROXY ERRO FATAL] BOMCONTROLE_API_KEY não definida!   ##');
  console.error('############################################################');
  process.exit(1);
} else {
  // Log para confirmar que a key foi carregada
  console.log(`[PROXY INICIALIZADO] API Key carregada (termina com: ...${API_KEY.slice(-6)})`);
}

app.use(cors()); 
app.use(express.json()); 

// Middleware "catch-all"
app.use(async (req, res) => {
  const apiPath = req.path;
  const targetUrl = `${BASE_URL}${apiPath}`;

  // Log de entrada
  console.log('\n============================================================');
  console.log(`[PROXY] Nova Requisição: ${new Date().toISOString()}`);
  console.log(`[PROXY] -> Caminho: ${req.path}`);
  console.log(`[PROXY] -> Método: ${req.method}`);
  console.log(`[PROXY] -> Query Params (Recebidos):`, JSON.stringify(req.query, null, 2));

  // Monta a configuração da chamada
  const config = {
    method: req.method,
    url: targetUrl,
    params: req.query,
    data: req.body,
    headers: {
      'Authorization': `ApiKey ${API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json' // Boa prática
    },
    timeout: 10000 // Timeout de 10 segundos
  };

  console.log('------------------------------------------------------------');
  console.log('[PROXY] -> CHAMANDO API BOMCONTROLE COM A SEGUINTE CONFIG:');
  console.log(`[PROXY] -> URL Destino: ${config.url}`);
  console.log('[PROXY] -> Params (Enviados):', JSON.stringify(config.params, null, 2));
  console.log('[PROXY] -> Body (Enviado):', JSON.stringify(config.data, null, 2));
  console.log('------------------------------------------------------------');

  try {
    // FAZ A CHAMADA
    const apiResponse = await axios(config);

    console.log(`[PROXY] -> SUCESSO! Status: ${apiResponse.status}`);
    console.log(`[PROXY] -> Resposta da API (${apiPath}):`, JSON.stringify(apiResponse.data, null, 2));

    res.status(apiResponse.status).send(apiResponse.data);

  } catch (error) {
    // ===================================================
    // LOG DETALHADO DO ERRO
    // ===================================================
    console.error('############################################################');
    console.error('[PROXY] -> ERRO AO CHAMAR API BOMCONTROLE!');
    
    if (error.response) {
      // O servidor respondeu com um erro (500, 404, 401, etc.)
      console.error(`[PROXY] -> ERRO | Status: ${error.response.status}`);
      console.error(`[PROXY] -> ERRO | StatusText: ${error.response.statusText}`);
      console.error('[PROXY] -> ERRO | Headers da Resposta:', JSON.stringify(error.response.headers, null, 2));
      console.error('[PROXY] -> ERRO | Corpo da Resposta (Data):', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      // O servidor não respondeu (timeout, etc.)
      console.error('[PROXY] -> ERRO | Sem Resposta. A requisição foi feita, mas o servidor não respondeu.');
      console.error(`[PROXY] -> ERRO | Código: ${error.code}`);
    } else {
      // Erro na configuração do axios
      console.error('[PROXY] -> ERRO | Erro de Configuração da Requisição:');
      console.error(error.message);
    }
    console.error('############################################################');

    const status = error.response ? error.response.status : 500;
    const data = error.response ? error.response.data : { message: 'Erro no proxy' };
    res.status(status).send(data);
  }
});

app.listen(PORT, () => {
  console.log(`Proxy BomControle (VERSÃO DE DEBUG) rodando na porta ${PORT}`);
});