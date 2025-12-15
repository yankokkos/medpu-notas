const express = require('express');
const { handleNFeIOWebhook } = require('./controller');

const router = express.Router();

// Webhook da NFe.io - endpoint público (sem autenticação)
// A validação é feita via assinatura do webhook
router.post('/nfeio', handleNFeIOWebhook);

module.exports = router;

