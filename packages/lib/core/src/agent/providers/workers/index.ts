import type { SseChatCompatibleOptions } from '#/agent/core/request';
import type { ChatAgent, ChatAgentResponse, ChatStreamTextHandler, ImageAgent, LLMChatParams } from '#/agent/core/types';
import type { AiTextGenerationOutput, AiTextToImageOutput } from '#/config';
import { isJsonResponse, mapResponseToAnswer, requestChatCompletions } from '#/agent/core/request';
import { bearerHeader, convertStringToResponseMessages, loadModelsList } from '#/agent/core/utils';
import { renderOpenAIMessages } from '#/agent/providers/openai';
import { ENV } from '#/config';

export interface WorkersChatSettings {
    accountId: string | null;
    token: string | null;
    model: string;
    modelsList: string;
    extraParams?: Record<string, any>;
}

export interface WorkersImageSettings {
    accountId: string | null;
    token: string | null;
    model: string;
    modelsList: string;
}

function loadWorkersModelList(task: string, settings: { accountId: string | null; token: string | null; modelsList: string }): () => Promise<string[]> {
    return async (): Promise<string[]> => {
        let uri = settings.modelsList;
        if (uri === '') {
            const taskEncoded = encodeURIComponent(task);
            uri = `https://api.cloudflare.com/client/v4/accounts/${settings.accountId}/ai/models/search?task=${taskEncoded}`;
        }
        return loadModelsList(uri, async (url): Promise<string[]> => {
            const header = {
                Authorization: `Bearer ${settings.token}`,
            };
            const data = await fetch(url, { headers: header }).then(res => res.json());
            return data.result?.map((model: any) => model.name) || [];
        });
    };
}

export class WorkersChat implements ChatAgent {
    readonly name = 'workers';
    readonly model: string;
    readonly modelList: () => Promise<string[]>;
    readonly request: ChatAgent['request'];

    constructor(private readonly settings: WorkersChatSettings) {
        this.model = settings.model;
        this.modelList = loadWorkersModelList('Text Generation', settings);
        this.request = async (
            params: LLMChatParams,
            onStream: ChatStreamTextHandler | null,
        ): Promise<ChatAgentResponse> => {
            const { prompt, messages } = params;
            const model = settings.model;
            const body = {
                ...(settings.extraParams || {}),
                messages: await renderOpenAIMessages(prompt, messages, null),
                stream: onStream !== null,
            };
            const options: SseChatCompatibleOptions = {};
            options.contentExtractor = function (data: any) {
                return data?.response;
            };
            options.fullContentExtractor = function (data: any) {
                return data?.result?.response;
            };
            options.errorExtractor = function (data: any) {
                return data?.errors?.at(0)?.message;
            };

            if (ENV.AI_BINDING) {
                const answer = await ENV.AI_BINDING.run(model, body);
                const response = WorkersChat.outputToResponse(answer, onStream !== null);
                return convertStringToResponseMessages(mapResponseToAnswer(response, new AbortController(), options, onStream));
            } else if (settings.accountId && settings.token) {
                const url = `https://api.cloudflare.com/client/v4/accounts/${settings.accountId}/ai/run/${model}`;
                const header = bearerHeader(settings.token, onStream !== null);
                return convertStringToResponseMessages(requestChatCompletions(url, header, body, onStream, options));
            } else {
                throw new Error('Cloudflare account ID and token are required');
            }
        };
    }

    static outputToResponse(output: AiTextGenerationOutput, stream: boolean): Response {
        if (stream && output instanceof ReadableStream) {
            return new Response(output, {
                headers: { 'content-type': 'text/event-stream' },
            });
        } else {
            return Response.json({ result: output });
        }
    }
}

export class WorkersImage implements ImageAgent {
    readonly name = 'workers';
    readonly model: string;
    readonly modelList: () => Promise<string[]>;
    readonly request: ImageAgent['request'];

    constructor(private readonly settings: WorkersImageSettings) {
        this.model = settings.model;
        this.modelList = loadWorkersModelList('Text-to-Image', settings);
        this.request = async (prompt: string): Promise<string | Blob> => {
            if (ENV.AI_BINDING) {
                const answer = await ENV.AI_BINDING.run(settings.model, { prompt });
                const raw = WorkersImage.outputToResponse(answer);
                return await WorkersImage.responseToImage(raw);
            } else if (settings.accountId && settings.token) {
                const raw = await WorkersImage.fetch(settings.model, { prompt }, settings.accountId, settings.token);
                return await WorkersImage.responseToImage(raw);
            } else {
                throw new Error('Cloudflare account ID and token are required');
            }
        };
    }

    static outputToResponse(output: AiTextToImageOutput): Response {
        if (output instanceof ReadableStream) {
            return new Response(output, {
                headers: {
                    'content-type': 'image/jpg',
                },
            });
        } else {
            return Response.json({ result: output });
        }
    }

    static async responseToImage(output: Response): Promise<string | Blob> {
        if (isJsonResponse(output)) {
            const { result } = await output.json();
            const image = result?.image;
            if (typeof image !== 'string') {
                throw new TypeError('Invalid image response');
            }
            return WorkersImage.base64StringToBlob(image);
        }
        return await output.blob();
    }

    static async base64StringToBlob(base64String: string): Promise<Blob> {
        if (typeof Buffer !== 'undefined') {
            const buffer = Buffer.from(base64String, 'base64');
            return new Blob([buffer], { type: 'image/png' });
        } else {
            const uint8Array = Uint8Array.from(atob(base64String), c => c.charCodeAt(0));
            return new Blob([uint8Array], { type: 'image/png' });
        }
    }

    static async fetch(model: string, body: any, id: string, token: string): Promise<Response> {
        return await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${id}/ai/run/${model}`,
            {
                headers: { Authorization: `Bearer ${token}` },
                method: 'POST',
                body: JSON.stringify(body),
            },
        );
    }
}
