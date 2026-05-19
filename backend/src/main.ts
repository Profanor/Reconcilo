import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Set global prefix
  app.setGlobalPrefix('api');

  // Enable CORS
  app.enableCors();

  // Setup Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle('Reconcilo API')
    .setDescription(
      'Automated reconciliation & matching engine for expected invoices and bank/POS inflows.',
    )
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(
    `🚀 Reconcilo Backend Engine running on http://localhost:${port}/api`,
  );
}
bootstrap();
