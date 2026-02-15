import type { SseChatCompatibleOptions } from '#/agent/core/request';
import { randomOpenAIApiKey } from '#/agent/provider_settings';
import type {
    ChatAgent,
    ChatAgentRequest,
    ChatAgentResponse,
    ChatStreamTextHandler,
    HistoryItem,
    ImageAgent,
    ImageAgentRequest,
    LLMChatParams,
} from '#/agent/core/types';
import { requestChatCompletions } from '#/agent/core/request';
import { bearerHeader, convertStringToResponseMessages, extractImageContent, loadModelsList } from '#/agent/core/utils';
import { ENV } from '#/config';
import { imageToBase64String, renderBase64DataURI } from '#/utils/image';

export enum ImageSupportFormat {
    URL = 'url',
    BASE64 = 'base64',
}

export interface OpenAICompatibleSettings {
    base: string;
    key: string | null;
    model: string;
    modelsList: string;
    extraParams?: Record<string, any>;
}

export interface OpenAIRequestHook {
    stream?: (text: string) => string;
    finish?: (text: string) => string;
}

export type OpenAIRequestBuilder = (
    params: LLMChatParams,
    settings: OpenAICompatibleSettings,
    stream: boolean,
) => Promise<{ url: string; header: Record<string, string>; body: any }>;

export interface DallESettings {
    apiBase: string;
    apiKeys: string[];
    model: string;
    modelsList: string;
    imageSize: string;
    imageQuality: string;
    imageStyle: string;
}

async function renderOpenAIMessage(item: HistoryItem, supportImage?: ImageSupportFormat[] | null): Promise<any> {
    const res: any = {
        role: item.role,
        content: item.content,
    };
    if (Array.isArray(item.content)) {
        const contents = [];
        for (const content of item.content) {
            switch (content.type) {
                case 'text':
                    contents.push({ type: 'text', text: content.text });
                    break;
                case 'image':
                    if (supportImage) {
                        const isSupportURL = supportImage.includes(ImageSupportFormat.URL);
                        const isSupportBase64 = supportImage.includes(ImageSupportFormat.BASE64);
                        const data = extractImageContent(content.image);
                        if (data.url) {
                            if (ENV.TELEGRAM_IMAGE_TRANSFER_MODE === 'base64' && isSupportBase64) {
                                contents.push(await imageToBase64String(data.url).then((data) => {
                                    return { type: 'image_url', image_url: { url: renderBase64DataURI(data) } };
                                }));
                            } else if (isSupportURL) {
                                contents.push({ type: 'image_url', image_url: { url: data.url } });
                            }
                        } else if (data.base64 && isSupportBase64) {
                            contents.push({ type: 'image_base64', image_base64: { base64: data.base64 } });
                        }
                    }
                    break;
                default:
                    break;
            }
        }
        res.content = contents;
    }
    return res;
}



export async function renderOpenAIMessages(prompt: string | undefined, items: HistoryItem[], supportImage?: ImageSupportFormat[] | null): Promise<any[]> {
    const messages = await Promise.all(items.map(r => renderOpenAIMessage(r, supportImage)));
    if (prompt) {
        if (messages.length > 0 && messages[0].role === 'system') {
            messages.shift();
        }
        messages.unshift({ role: 'system', content: prompt });
    }
    return messages;
}

export function loadOpenAIModelList(list: string, base: string, headers: Record<string, string>): Promise<string[]> {
    if (list === '') {
        list = `${base}/models`;
    }
    return loadModelsList(list, async (url): Promise<string[]> => {
        const data = await fetch(url, { headers }).then(res => res.json()) as any;
        return data.data?.map((model: any) => model.id) || [];
    });
}

export function createOpenAIRequest(
    builder: OpenAIRequestBuilder,
    settings: OpenAICompatibleSettings,
    options?: SseChatCompatibleOptions,
    hooks?: OpenAIRequestHook,
): ChatAgentRequest {
    return async (params: LLMChatParams, onStream: ChatStreamTextHandler | null): Promise<ChatAgentResponse> => {
        const { url, header, body } = await builder(params, settings, onStream !== null);
        if (onStream && hooks?.stream) {
            const onStreamOriginal = onStream;
            onStream = (text: string) => {
                return onStreamOriginal(hooks.stream!(text));
            };
        }
        let output = await requestChatCompletions(url, header, body, onStream, options || null);
        if (hooks?.finish) {
            output = hooks.finish(output);
        }
        return convertStringToResponseMessages(output);
    };
}

export function defaultOpenAIRequestBuilder(
    completionsEndpoint: string = '/chat/completions',
    supportImage: ImageSupportFormat[] = [ImageSupportFormat.URL],
): OpenAIRequestBuilder {
    return async (params: LLMChatParams, settings: OpenAICompatibleSettings, stream: boolean) => {
        const { prompt, messages } = params;
        const { base, key, model, extraParams } = settings;
        const url = `${base}${completionsEndpoint}`;
        const header = bearerHeader(key, stream);
        const body = {
            ...(extraParams || {}),
            model,
            stream,
            messages: await renderOpenAIMessages(prompt, messages, supportImage),
        };
        return { url, header, body };
    };
}

export class OpenAI implements ChatAgent {
    readonly name: string;
    readonly model: string;
    readonly modelList: () => Promise<string[]>;
    readonly request: ChatAgentRequest;

    constructor(
        name: string,
        settings: OpenAICompatibleSettings,
        requestBuilder?: OpenAIRequestBuilder,
        options?: SseChatCompatibleOptions,
        hooks?: OpenAIRequestHook,
    ) {
        this.name = name;
        this.model = settings.model;
        this.modelList = () => loadOpenAIModelList(settings.modelsList, settings.base, bearerHeader(settings.key));
        this.request = createOpenAIRequest(
            requestBuilder || defaultOpenAIRequestBuilder(),
            settings,
            options,
            hooks,
        );
    }
}

export class Dalle implements ImageAgent {
    readonly name = 'openai';
    readonly model: string;
    readonly modelList: () => Promise<string[]>;
    readonly request: ImageAgentRequest;

    constructor(private readonly settings: DallESettings) {
        this.model = settings.model;
        this.modelList = () => loadModelsList(settings.modelsList);
        this.request = async (prompt: string): Promise<string | Blob> => {
            const url = `${settings.apiBase}/images/generations`;
            const header = bearerHeader(randomOpenAIApiKey(settings.apiKeys) || '');
            const body: any = {
                prompt,
                n: 1,
                size: settings.imageSize,
                model: settings.model,
            };
            if (body.model === 'dall-e-3') {
                body.quality = settings.imageQuality;
                body.style = settings.imageStyle;
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
