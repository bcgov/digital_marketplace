"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const app_service_1 = require("./app.service");
const runtime_1 = require("@copilotkit/runtime");
const langchain_service_wrapper_1 = require("./langchain-service-wrapper");
class ChatCompletionDto {
    messages;
}
let AppController = class AppController {
    appService;
    langChainService;
    constructor(appService, langChainService) {
        this.appService = appService;
        this.langChainService = langChainService;
    }
    copilotkit(req, res) {
        const model = this.langChainService;
        const runtime = new runtime_1.CopilotRuntime();
        const handler = (0, runtime_1.copilotRuntimeNestEndpoint)({
            runtime,
            serviceAdapter: new runtime_1.LangChainAdapter({
                chainFn: async ({ messages }) => {
                    return model.invoke(messages);
                }
            }),
            endpoint: '/copilotkit',
        });
        return handler(req, res);
    }
    async chatCompletion(body) {
        const result = await this.langChainService.invoke(body.messages);
        return { response: result.content };
    }
    async generateChatCompletion(dto) {
        return this.appService.generateChatCompletion(dto.messages);
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.All)('/copilotkit'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "copilotkit", null);
__decorate([
    (0, common_1.Post)('chat2'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "chatCompletion", null);
__decorate([
    (0, common_1.Post)('chat'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ChatCompletionDto]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "generateChatCompletion", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService, typeof (_a = typeof langchain_service_wrapper_1.LangChainAzureAIService !== "undefined" && langchain_service_wrapper_1.LangChainAzureAIService) === "function" ? _a : Object])
], AppController);
//# sourceMappingURL=app.controller.js.map
