import type { SseChatCompatibleOptions } from '#/agent/core/request';
import type { SSEMessage, SSEParserResult } from '#/agent/core/stream';
import type {
    ChatAgent,
    ChatAgentRequest,
    ChatAgentResponse,
    ChatStreamTextHandler,
    HistoryItem,
    LLMChatParams,
} from '#/agent/core/types';
import { requestChatCompletions } from '#/agent/core/request';
import { Stream } from '#/agent/core/stream';
import { convertStringToResponseMessages, extractImageContent } from '#/agent/core/utils';
import { ENV } from '#/config';
import { imageToBase64String } from '#/utils/image';
import { loadOpenAIModelList } from '../openai';

export interface AnthropicSettings {
    apiKey: string | null;
    apiBase: string;
    chatModel: string;
    chatModelsList: string;
    apiVersion?: string;
    apiBeta?: string[];
    chatExtraParams?: Record<string, any>;
}

const LATEST_ANTHROPIC_API_VERSION = '2023-06-01';

function anthropicHeader(
    apiKey: string | null,
    options?: {
        apiVersion?: string | null;
        apiBeta?: string[] | null;
        stream?: boolean;
    },
): Record<string, string> {
    const res: Record<string, string> = {
        'x-api-key': apiKey || '',
        'anthropic-version': options?.apiVersion || LATEST_ANTHROPIC_API_VERSION,
        'content-type': 'application/json',
        'accept': options?.stream ? 'text/event-stream' : 'application/json',
    };
    const beta = options?.apiBeta?.map(item => item.trim()).filter(Boolean) || [];
    if (beta.length > 0) {
        res['anthropic-beta'] = beta.join(',');
    }
    return res;
}

export class Anthropic implements ChatAgent {
    readonly name = 'anthropic';
    readonly model: string;
    readonly modelList: () => Promise<string[]>;
    readonly request: ChatAgentRequest;

    constructor(private readonly settings: AnthropicSettings) {
        this.model = settings.chatModel;
        this.modelList = () => {
            return loadOpenAIModelList(
                settings.chatModelsList,
                settings.apiBase,
                anthropicHeader(settings.apiKey, {
                    apiVersion: settings.apiVersion,
                    apiBeta: settings.apiBeta,
                    stream: false,
                }),
            );
        };
        this.request = async (
            params: LLMChatParams,
            onStream: ChatStreamTextHandler | null,
        ): Promise<ChatAgentResponse> => {
            const { prompt, messages: rawMessages } = params;
            const url = `${settings.apiBase}/messages`;
            const header = anthropicHeader(settings.apiKey, {
                apiVersion: settings.apiVersion,
                apiBeta: settings.apiBeta,
                stream: onStream != null,
            });
            const messages = rawMessages.length > 0 && rawMessages[0].role === 'system'
                ? rawMessages.slice(1)
                : rawMessages;

            const body = {
                ...(settings.chatExtraParams || {}),
                system: prompt,
                model: settings.chatModel,
                messages: (await Promise.all(messages.map(item => Anthropic.render(item)))).filter(i => i !== null),
                stream: onStream != null,
                max_tokens: ENV.MAX_TOKEN_LENGTH > 0 ? ENV.MAX_TOKEN_LENGTH : 2048,
            };
            if (!body.system) {
                delete body.system;
            }
            const options: SseChatCompatibleOptions = {};
            options.streamBuilder = function (r, c) {
                return new Stream(r, c, Anthropic.parser);
            };
            options.contentExtractor = function (data: any) {
                return data?.delta?.text || data?.content_block?.text;
            };
            options.fullContentExtractor = function (data: any) {
                if (typeof data?.completion === 'string') {
                    return data.completion;
                }
                if (!Array.isArray(data?.content)) {
                    return null;
                }
                return data.content
                    .filter((item: any) => item?.type === 'text' && typeof item.text === 'string')
                    .map((item: any) => item.text)
                    .join('');
            };
            options.errorExtractor = function (data: any) {
                return data?.error?.message || data?.message;
            };
            return convertStringToResponseMessages(requestChatCompletions(url, header, body, onStream, options));
        };
    }

    private static render = async (item: HistoryItem): Promise<any> => {
        const res: Record<string, any> = {
            role: item.role,
            content: item.content,
        };
        if (item.role === 'system') {
            return null;
        }
        if (Array.isArray(item.content)) {
            const contents = [];
            for (const content of item.content) {
                switch (content.type) {
                    case 'text':
                        contents.push({ type: 'text', text: content.text });
                        break;
                    case 'image': {
                        const data = extractImageContent(content.image);
                        if (data.url) {
                            try {
                                contents.push(await imageToBase64String(data.url).then(({ format, data }) => {
                                    return { type: 'image', source: { type: 'base64', media_type: format, data } };
                                }));
                            } catch (e) {
                                // Anthropic now supports URL sources, use it as a compatibility fallback.
                                console.warn('Anthropic image conversion failed, fallback to url source', e);
                                contents.push({ type: 'image', source: { type: 'url', url: data.url } });
                            }
                        } else if (data.base64) {
                            contents.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: data.base64 } });
                        }
                        break;
                    }
                    default:
                        break;
                }
            }
            res.content = contents;
        }
        return res;
    };

    private static parser(sse: SSEMessage): SSEParserResult {
        // example:
        //      event: content_block_delta
        //      data: {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": "Hello"}}
        //      event: message_stop
        //      data: {"type": "message_stop"}
        let data: any = null;
        if (sse.data) {
            try {
                data = JSON.parse(sse.data || '');
            } catch (e) {
                console.error(e, sse.data);
                return {};
            }
        }
        const event = sse.event || data?.type;
        switch (event) {
            case 'content_block_delta':
            case 'content_block_start':
                return { data };
            case 'error':
                throw new Error(data?.error?.message || data?.message || 'Unknown Anthropic stream error');
            case 'message_stop':
                return { finish: true };
            default:
                return {};
        }
    }
}
