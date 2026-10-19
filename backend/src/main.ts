import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix
  app.setGlobalPrefix('api');

  // Hardened CORS policy
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (curl, server-to-server) or matching origin in whitelist
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.netlify.app') ||
        origin.endsWith('.onrender.com') ||
        process.env.NODE_ENV !== 'production'
      ) {
        callback(null, true);
      } else {
        callback(new Error('CORS request blocked by Lissafi security policy.'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'x-tenant-id',
      'x-tenant-slug',
      'X-Tenant-Id',
      'X-Tenant-Slug',
    ],
  });

  // Setup Swagger API documentation under /api/docs
  const config = new DocumentBuilder()
    .setTitle('Lissafi Financial Truth Engine API')
    .setDescription(
      'Automated reconciliation & matching engine for expected invoices and bank/POS inflows.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'x-api-key')
    .addGlobalParameters({
      name: 'x-tenant-id',
      in: 'header',
      required: false,
      description: 'Tenant ID context (e.g. tenant-apex-001, tenant-alaba-002)',
    })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(
    `🚀 Lissafi Backend Engine running on http://localhost:${port}/api (Docs: http://localhost:${port}/api/docs)`,
  );
}
bootstrap();
