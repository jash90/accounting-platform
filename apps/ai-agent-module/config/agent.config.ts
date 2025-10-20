export default () => ({
  app: {
    port: parseInt(process.env.PORT, 10) || 3000,
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  database: {
    url: process.env.DATABASE_URL,
    type: 'postgres',
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.NODE_ENV === 'development',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
  },

  vectorDb: {
    url: process.env.VECTOR_DB_URL || 'http://localhost:6333',
  },

  llm: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
    },
  },

  aws: {
    region: process.env.AWS_REGION || 'eu-central-1',
    s3Bucket: process.env.S3_BUCKET,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },

  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    encryptionKey: process.env.ENCRYPTION_KEY,
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 60000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
    logLevel: process.env.LOG_LEVEL || 'info',
  },

  costManagement: {
    monthlyBudgetUsd: parseFloat(process.env.MONTHLY_BUDGET_USD) || 1000,
    costAlertThreshold: parseFloat(process.env.COST_ALERT_THRESHOLD) || 0.8,
  },
});
