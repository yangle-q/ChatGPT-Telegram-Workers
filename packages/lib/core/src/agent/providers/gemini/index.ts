import type { ChatAgent } from '#/agent/core/types';
import type { OpenAICompatibleSettings } from '#/agent/providers/openai';
import { loadModelsList } from '#/agent/core/utils';
import { createOpenAIRequest, defaultOpenAIRequestBuilder, ImageSupportFormat } from '#/agent/providers/openai';

export class Gemini implements ChatAgent {
    readonly name = 'gemini';
    readonly model: string;
    readonly modelList: () => Promise<string[]>;
    readonly request: ChatAgent['request'];

    constructor(private readonly settings: OpenAICompatibleSettings) {
        this.model = settings.model;
        this.modelList = async (): Promise<string[]> => {
            const modelsList = settings.modelsList || `${settings.base}/models`;
            return loadModelsList(modelsList, async (url): Promise<string[]> => {
                const data = await fetch(`${url}?key=${settings.key || ''}`).then(r => r.json());
                return data?.models
                    ?.filter((model: any) => model.supportedGenerationMethods?.includes('generateContent'))
                    .map((model: any) => model.name.split('/').pop()) ?? [];
            });
        };
        this.request = createOpenAIRequest(
            defaultOpenAIRequestBuilder('/openai/chat/completions', [ImageSupportFormat.BASE64]),
            settings,
        );
    }
}
