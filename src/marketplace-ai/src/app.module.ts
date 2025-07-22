import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { LangChainAzureAIService } from './langchain-azure-ai.service';
import { RagController } from './rag.controller';
import { SyncController } from './sync.controller';
import { AiController } from './controllers/ai.controller';
import { CopilotController } from './controllers/copilot.controller';
import { VectorService } from './vector.service';
import { ChromaSyncService } from './chroma-sync.service';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    AuthModule,
  ],
  controllers: [
    AppController,
    AiController,
    CopilotController,
    RagController,
    SyncController,
  ],
  providers: [
    AppService,
    LangChainAzureAIService,
    VectorService,
    ChromaSyncService,
  ],
})
export class AppModule {}
