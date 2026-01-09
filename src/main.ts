import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable global validation pipe for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configure Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('Datacrazy Backend Challenge - Pessoa API')
    .setDescription(
      'REST API for managing Pessoa records with intelligent caching.\n\n' +
        '## Features\n\n' +
        '- **CRUD Operations**: Full Create, Read, Update, Delete support\n' +
        '- **Native SQL Queries**: `findByEmail` and `findByTelefone` use native SQL\n' +
        '- **Intelligent Caching**: SHA256-based cache keys with 5-minute TTL\n' +
        '- **Automatic Cache Eviction**: Cache is cleared on updates/deletes\n' +
        '- **Cache Monitoring**: Check console logs for HIT/MISS behavior\n\n' +
        '## Testing Cache Behavior\n\n' +
        '1. Create a Pessoa record using POST /pessoas\n' +
        '2. Search by email using GET /pessoas/email/{email} (Cache MISS - check console)\n' +
        '3. Search again with the same email (Cache HIT - check console)\n' +
        '4. Update the record using PUT /pessoas/{id}\n' +
        '5. Search by email again (Cache MISS - cache was evicted)\n\n' +
        '## Technologies\n\n' +
        '- NestJS + TypeScript\n' +
        '- Prisma ORM with PostgreSQL adapter\n' +
        '- cache-manager (in-memory caching)\n' +
        '- class-validator for DTO validation',
    )
    .setVersion('1.0')
    .addTag('Pessoas', 'Endpoints for managing Pessoa records')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'Pessoa API - Datacrazy Challenge',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`\n🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api\n`);
}

void bootstrap();
