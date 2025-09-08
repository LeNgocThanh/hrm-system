import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser'; // Import cookie-parser


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Thay đổi thành frontend của bạn
    credentials: true,
  });
  console.log('CORS enabled for:', process.env.FRONTEND_URL || 'http://localhost:3000');
  app.use(cookieParser());
  const config = new DocumentBuilder()
    .setTitle('Tên API của bạn')
    .setDescription('Mô tả API')
    .setVersion('1.0')
    .addBearerAuth() // nếu bạn dùng JWT
    .build();
    const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
