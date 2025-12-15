const { query } = require('../../config/database');
const nfeioService = require('../../services/nfeioService');

/**
 * Handler para webhooks da NFe.io
 * Este endpoint é público (sem autenticação) pois é chamado pela NFe.io
 */
const handleNFeIOWebhook = async (req, res) => {
  try {
    const payload = req.body;
    const signature = req.headers['x-nfeio-signature'] || req.headers['x-signature'] || '';

    // Validar assinatura do webhook (se configurado)
    if (process.env.NFEIO_WEBHOOK_SECRET) {
      const isValid = nfeioService.validarWebhookSignature(payload, signature);
      if (!isValid) {
        console.warn('⚠️  Webhook recebido com assinatura inválida');
        return res.status(401).json({
          success: false,
          message: 'Assinatura inválida'
        });
      }
    }

    // Extrair informações do webhook
    // A estrutura pode variar conforme a documentação da NFe.io
    const apiRef = payload.id || payload.reference || payload.external_id;
    const status = payload.status;
    const eventType = payload.event || payload.type || 'status_change';

    if (!apiRef) {
      console.warn('⚠️  Webhook recebido sem referência da API');
      return res.status(400).json({
        success: false,
        message: 'Referência da API não encontrada no payload'
      });
    }

    // Buscar nota pelo api_ref
    const [nota] = await query(`
      SELECT id, status, api_ref
      FROM notas_fiscais
      WHERE api_ref = ? AND api_provider = 'NFEIO'
    `, [apiRef]);

    if (!nota) {
      console.warn(`⚠️  Nota não encontrada para api_ref: ${apiRef}`);
      // Retornar 200 mesmo assim para não causar retry desnecessário
      return res.status(200).json({
        success: true,
        message: 'Webhook recebido mas nota não encontrada'
      });
    }

    // Processar evento conforme status
    let novoStatus = nota.status;
    let caminhoXml = null;
    let caminhoPdf = null;
    let mensagemErro = null;
    let dataEmissao = null;

    switch (status?.toLowerCase()) {
      case 'issued':
      case 'autorizada':
      case 'authorized':
      case 'approved':
        novoStatus = 'AUTORIZADA';
        caminhoXml = payload.xml_url || payload.xml || payload.urls?.xml;
        caminhoPdf = payload.pdf_url || payload.pdf || payload.urls?.pdf;
        dataEmissao = payload.data_emissao || payload.issued_at || payload.issuedOn || new Date();
        break;

      case 'erro':
      case 'error':
      case 'rejected':
      case 'rejeitada':
        novoStatus = 'ERRO';
        mensagemErro = payload.mensagem || payload.message || payload.error || 'Erro na autorização da nota fiscal';
        break;

      case 'cancelada':
      case 'cancelled':
      case 'canceled':
        novoStatus = 'CANCELADA';
        break;

      case 'processando':
      case 'processing':
      case 'pending':
        novoStatus = 'PROCESSANDO';
        break;

      default:
        console.log(`ℹ️  Status desconhecido recebido: ${status}`);
    }

    // Atualizar nota no banco
    await query(`
      UPDATE notas_fiscais SET
        status = ?,
        caminho_xml = COALESCE(?, caminho_xml),
        caminho_pdf = COALESCE(?, caminho_pdf),
        mensagem_erro = COALESCE(?, mensagem_erro),
        data_emissao = COALESCE(?, data_emissao),
        updated_at = NOW()
      WHERE id = ?
    `, [novoStatus, caminhoXml, caminhoPdf, mensagemErro, dataEmissao, nota.id]);

    console.log(`✅ Webhook processado: Nota ${nota.id} atualizada para status ${novoStatus}`);

    // Retornar 200 para confirmar recebimento
    res.status(200).json({
      success: true,
      message: 'Webhook processado com sucesso',
      data: {
        nota_id: nota.id,
        status: novoStatus
      }
    });

  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    // Retornar 500 para que a NFe.io tente novamente
    res.status(500).json({
      success: false,
      message: 'Erro ao processar webhook'
    });
  }
};

module.exports = {
  handleNFeIOWebhook
};

