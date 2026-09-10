import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { RecordsModule } from './records/records.module';
import { RejectionsModule } from './rejections/rejections.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    IngestionModule,
    RecordsModule,
    RejectionsModule,
  ],
})
export class AppModule {}
