import type { ChatAgent } from '#/agent/core/types';
import type { OpenAICompatibleSettings } from '#/agent/providers/openai';
import { loadModelsList } from '#/agent/core/utils';
import { createOpenAIRequest, defaultOpenAIRequestBuilder, ImageSupportFormat } from '#/agent/providers/openai';

export interface GeminiSettings {
    apiBase: string;
    apiKey: string | null;
    chatModel: string;
    chatModelsList: string;
    chatExtraParams?: Record<string, any>;
}

export class Gemini implements ChatAgent {
    readonly name = 'gemini';
    readonly model: string;
    readonly modelList: () => Promise<string[]>;
    readonly request: ChatAgent['request'];

    constructor(private readonly settings: GeminiSettings) {
        this.model = settings.chatModel;
        this.modelList = async (): Promise<string[]> => {
            const modelsList = settings.chatModelsList || `${settings.apiBase}/models`;
            return loadModelsList(modelsList, async (url): Promise<string[]> => {
                const data = await fetch(`${url}?key=${settings.apiKey || ''}`).then(r => r.json());
                return data?.models
                    ?.filter((model: any) => model.supportedGenerationMethods?.includes('generateContent'))
                    .map((model: any) => model.name.split('/').pop()) ?? [];
            });
        };
        const openAISettings: OpenAICompatibleSettings = {
            base: settings.apiBase,
            key: settings.apiKey,
            model: settings.chatModel,
            modelsList: settings.chatModelsList,
            extraParams: settings.chatExtraParams,
        };
        this.request = createOpenAIRequest(
            defaultOpenAIRequestBuilder('/openai/chat/completions', [ImageSupportFormat.BASE64]),
            openAISettings,
        );
    }
}
