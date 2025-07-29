'use strict';
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
          ? (desc = Object.getOwnPropertyDescriptor(target, key))
          : desc,
      d;
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.AppModule = void 0;
const common_1 = require('@nestjs/common');
const app_controller_1 = require('./app.controller');
const app_service_1 = require('./app.service');
const config_1 = require('@nestjs/config');
const langchain_azure_ai_service_1 = require('./langchain-azure-ai.service');
const rag_controller_1 = require('./rag.controller');
const sync_controller_1 = require('./sync.controller');
const vector_service_1 = require('./vector.service');
const chroma_sync_service_1 = require('./chroma-sync.service');
const schedule_1 = require('@nestjs/schedule');
const auth_module_1 = require('./auth/auth.module');
let AppModule = class AppModule {};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate(
  [
    (0, common_1.Module)({
      imports: [
        config_1.ConfigModule.forRoot({
          isGlobal: true,
        }),
        schedule_1.ScheduleModule.forRoot(),
        auth_module_1.AuthModule,
      ],
      controllers: [
        app_controller_1.AppController,
        rag_controller_1.RagController,
        sync_controller_1.SyncController,
      ],
      providers: [
        app_service_1.AppService,
        langchain_azure_ai_service_1.LangChainAzureAIService,
        vector_service_1.VectorService,
        chroma_sync_service_1.ChromaSyncService,
      ],
    }),
  ],
  AppModule,
);
//# sourceMappingURL=app.module.js.map
