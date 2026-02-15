import type {
    ChatAgent,
    ChatAgentRequest,
    ChatAgentResponse,
    ChatStreamTextHandler,
    ImageAgent,
    ImageAgentRequest,
    LLMChatParams,
} from '#/agent/core/types';
import { requestChatCompletions } from '#/agent/core/request';
import { convertStringToResponseMessages, loadModelsList } from '#/agent/core/utils';
import { ImageSupportFormat, renderOpenAIMessages } from '../openai';

export interface AzureChatSettings {
    apiKey: string | null;
    resourceName: string | null;
    chatModel: string;
    apiVersion: string;
    chatModelsList: string;
    chatExtraParams?: Record<string, any>;
}

export interface AzureImageSettings {
    apiKey: string | null;
    resourceName: string | null;
    imageModel: string;
    apiVersion: string;
    imageSize: string;
    imageStyle: string;
    imageQuality: string;
}

function azureHeader(apiKey: string | null): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        'api-key': apiKey || '',
    };
}

export class AzureChatAI implements ChatAgent {
    readonly name = 'azure';
    readonly model: string;
    readonly modelList: () => Promise<string[]>;
    readonly request: ChatAgentRequest;

    constructor(private readonly settings: AzureChatSettings) {
        this.model = settings.chatModel;
        this.modelList = async (): Promise<string[]> => {
            const resource = settings.resourceName || '';
            const defaultList = `https://${resource}.openai.azure.com/openai/models?api-version=${settings.apiVersion}`;
            const modelsList = settings.chatModelsList || defaultList;
            return loadModelsList(modelsList, async (url): Promise<string[]> => {
                const data = await fetch(url, {
                    headers: azureHeader(settings.apiKey),
                }).then(res => res.json()) as any;
                return data.data?.map((model: any) => model.id) || [];
            });
        };
        this.request = async (
            params: LLMChatParams,
            onStream: ChatStreamTextHandler | null,
        ): Promise<ChatAgentResponse> => {
            const { prompt, messages } = params;
            const resource = settings.resourceName || '';
            const url = `https://${resource}.openai.azure.com/openai/deployments/${settings.chatModel}/chat/completions?api-version=${settings.apiVersion}`;
            const header = azureHeader(settings.apiKey);
            const body = {
                ...(settings.chatExtraParams || {}),
                messages: await renderOpenAIMessages(prompt, messages, [ImageSupportFormat.URL, ImageSupportFormat.BASE64]),
                stream: onStream != null,
            };
            return convertStringToResponseMessages(requestChatCompletions(url, header, body, onStream, null));
        };
    }
}

export class AzureImageAI implements ImageAgent {
    readonly name = 'azure';
    readonly model: string;
    readonly modelList: () => Promise<string[]>;
    readonly request: ImageAgentRequest;

    constructor(private readonly settings: AzureImageSettings) {
        this.model = settings.imageModel;
        this.modelList = () => Promise.resolve([settings.imageModel]);
        this.request = async (prompt: string): Promise<string | Blob> => {
            const resource = settings.resourceName || '';
            const url = `https://${resource}.openai.azure.com/openai/deployments/${settings.imageModel}/images/generations?api-version=${settings.apiVersion}`;
            const header = azureHeader(settings.apiKey);
            const body = {
                prompt,
                n: 1,
                size: settings.imageSize,
                style: settings.imageStyle,
                quality: settings.imageQuality,
            };
            const validSize = ['1792x1024', '1024x1024', '1024x1792'];
            if (!validSize.includes(body.size)) {
                body.size = '1024x1024';
            }
            const resp = await fetch(url, {
                method: 'POST',
                headers: header,
                body: JSON.stringify(body),
            }).then(res => res.json()) as any;

            if (resp.error?.message) {
                throw new Error(resp.error.message);
            }
            return resp?.data?.at(0)?.url;
        };
    }
}
