const mysql = require('mysql2');
// Carregar variáveis de ambiente
// Em produção, usar variáveis de ambiente do sistema
// Em desenvolvimento, usar config.env se existir
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: './config.env' });
}

// Configuração do pool de conexões
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Configurações válidas para mysql2
  charset: 'utf8mb4',
  // Configurações para evitar ECONNRESET
  keepAliveInitialDelay: 0,
  enableKeepAlive: true,
  // Configurações de timeout
  connectTimeout: 60000
});

// Handlers de eventos do pool para detectar e tratar problemas de conexão
pool.on('connection', (connection) => {
  console.log('🔌 Nova conexão MySQL estabelecida');
  
  // Handler para erros de conexão
  connection.on('error', (err) => {
    console.error('❌ Erro na conexão MySQL:', err.message);
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
      console.log('🔄 Conexão perdida detectada - o pool tentará reconectar automaticamente');
    }
  });
});

pool.on('acquire', (connection) => {
  // Verificar se a conexão está válida antes de usar
  if (connection.state === 'disconnected') {
    console.warn('⚠️ Conexão desconectada detectada, tentando reconectar...');
  }
});

pool.on('release', (connection) => {
  // Verificar integridade da conexão ao liberar
  if (connection.state === 'disconnected') {
    console.warn('⚠️ Conexão desconectada ao liberar');
  }
});

// Promisify para usar async/await
const promisePool = pool.promise();

// Teste de conexão
const testConnection = async () => {
  try {
    const connection = await promisePool.getConnection();
    console.log('✅ Conexão com banco de dados estabelecida com sucesso!');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar com banco de dados:', error.message);
    return false;
  }
};

// Função auxiliar para verificar se o erro é recuperável
const isRecoverableError = (error) => {
  const recoverableErrors = [
    'ECONNRESET',
    'PROTOCOL_CONNECTION_LOST',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED'
  ];
  return recoverableErrors.includes(error.code);
};

// Função para executar queries com retry automático
const query = async (sql, params = [], retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const [rows] = await promisePool.query(sql, params);
      return rows;
    } catch (error) {
      const isLastAttempt = attempt === retries;
      const isRecoverable = isRecoverableError(error);
      
      console.error(`❌ Erro na query (tentativa ${attempt}/${retries}):`, {
        code: error.code,
        message: error.message,
        sql: sql.substring(0, 100) + '...'
      });
      
      // Se não for um erro recuperável ou for a última tentativa, lançar o erro
      if (!isRecoverable || isLastAttempt) {
        throw error;
      }
      
      // Se for um erro recuperável, aguardar antes de tentar novamente
      if (isRecoverable && !isLastAttempt) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Backoff exponencial
        console.log(`🔄 Tentando reconectar em ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Tentar obter uma nova conexão
        try {
          const connection = await promisePool.getConnection();
          connection.release();
          console.log('✅ Nova conexão estabelecida, tentando query novamente...');
        } catch (connError) {
          console.error('❌ Erro ao obter nova conexão:', connError.message);
        }
      }
    }
  }
};

// Função para executar transações com tratamento de reconexão
const transaction = async (callback, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    let connection;
    try {
      connection = await promisePool.getConnection();
      
      // Verificar se a conexão está válida
      if (connection.state === 'disconnected') {
        throw new Error('Conexão desconectada');
      }
      
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      connection.release();
      return result;
    } catch (error) {
      const isLastAttempt = attempt === retries;
      const isRecoverable = isRecoverableError(error);
      
      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error('❌ Erro ao fazer rollback:', rollbackError.message);
        }
        
        try {
          connection.release();
        } catch (releaseError) {
          console.error('❌ Erro ao liberar conexão:', releaseError.message);
        }
      }
      
      // Se não for um erro recuperável ou for a última tentativa, lançar o erro
      if (!isRecoverable || isLastAttempt) {
        throw error;
      }
      
      // Se for um erro recuperável, aguardar antes de tentar novamente
      if (isRecoverable && !isLastAttempt) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`🔄 Tentando transação novamente em ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
};

module.exports = {
  pool: promisePool,
  query,
  transaction,
  testConnection
};

