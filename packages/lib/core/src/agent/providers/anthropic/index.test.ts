import type { LLMChatParams } from '#/agent/core/types';
import { Anthropic } from './index';

const originalFetch = globalThis.fetch;

describe('anthropic provider', () => {
    afterEach(() => {
        globalThis.fetch = originalFetch;
        jest.restoreAllMocks();
    });

    it('should send latest anthropic headers and merge text blocks in non-stream mode', async () => {
        const fetchMock = jest.fn(async () => {
            return new Response(
                JSON.stringify({
                    content: [
                        { type: 'text', text: 'Hello ' },
                        { type: 'tool_use', id: 'tool_1', name: 'noop', input: {} },
                        { type: 'text', text: 'world' },
                    ],
                }),
                {
                    headers: { 'content-type': 'application/json' },
                },
            );
        });
        globalThis.fetch = fetchMock as any;

        const agent = new Anthropic({
            apiKey: 'test-key',
            apiBase: 'https://api.anthropic.com/v1',
            apiVersion: '2023-06-01',
            apiBeta: ['tools-2025-03-01'],
            chatModel: 'claude-sonnet-4-5',
            chatModelsList: '',
        });

        const params: LLMChatParams = {
            prompt: 'You are helpful.',
            messages: [{ role: 'user', content: 'Say hello.' }],
        };
        const result = await agent.request(params, null);

        expect(result.text).toBe('Hello world');
        expect(fetchMock).toHaveBeenCalledTimes(1);

        expect(fetchMock.mock.calls[0]).toBeDefined();
        const [requestUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit];
        const headers = requestInit.headers as Record<string, string>;
        const body = JSON.parse(requestInit.body as string);
        const requestUrlText = typeof requestUrl === 'string'
            ? requestUrl
            : requestUrl instanceof URL
                ? requestUrl.toString()
                : requestUrl.url;

        expect(requestUrlText).toBe('https://api.anthropic.com/v1/messages');
        expect(headers['x-api-key']).toBe('test-key');
        expect(headers['anthropic-version']).toBe('2023-06-01');
        expect(headers['anthropic-beta']).toBe('tools-2025-03-01');
        expect(headers.accept).toBe('application/json');
        expect(body.model).toBe('claude-sonnet-4-5');
        expect(body.stream).toBe(false);
        expect(body.max_tokens).toBe(2048);
        expect(body.system).toBe('You are helpful.');
    });

    it('should parse text from content_block_start and content_block_delta in stream mode', async () => {
        const streamPayload = [
            'event: content_block_start',
            'data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":"Hel"}}',
            '',
            'event: content_block_delta',
            'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"lo"}}',
            '',
            'event: message_stop',
            'data: {"type":"message_stop"}',
            '',
        ].join('\n');

        const fetchMock = jest.fn(async () => {
            return new Response(streamPayload, {
                headers: { 'content-type': 'text/event-stream' },
            });
        });
        globalThis.fetch = fetchMock as any;

        const agent = new Anthropic({
            apiKey: 'test-key',
            apiBase: 'https://api.anthropic.com/v1',
            chatModel: 'claude-sonnet-4-5',
            chatModelsList: '',
        });

        const params: LLMChatParams = {
            prompt: '',
            messages: [{ role: 'user', content: 'Say hello.' }],
        };
        const result = await agent.request(params, async () => {});

        expect(fetchMock.mock.calls[0]).toBeDefined();
        const [, requestInit] = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit];
        const headers = requestInit.headers as Record<string, string>;

        expect(result.text).toBe('Hello');
        expect(headers.accept).toBe('text/event-stream');
    });

    it('should fallback to url image source when base64 conversion fails', async () => {
        const imageUrl = 'https://example.com/not-supported-image.bin';
        let requestInit: RequestInit | undefined;
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
            const url = typeof input === 'string'
                ? input
                : input instanceof URL
                    ? input.toString()
                    : input.url;

            if (url === imageUrl) {
                return new Response(Uint8Array.from([0]), {
                    headers: { 'content-type': 'application/octet-stream' },
                });
            }
            if (url.endsWith('/messages')) {
                requestInit = init;
                return new Response(
                    JSON.stringify({
                        content: [{ type: 'text', text: 'ok' }],
                    }),
                    {
                        headers: { 'content-type': 'application/json' },
                    },
                );
            }
            throw new Error(`Unexpected url: ${url}`);
        });
        globalThis.fetch = fetchMock as any;

        const agent = new Anthropic({
            apiKey: 'test-key',
            apiBase: 'https://api.anthropic.com/v1',
            chatModel: 'claude-sonnet-4-5',
            chatModelsList: '',
        });

        const params: LLMChatParams = {
            prompt: '',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: 'describe this image' },
                        { type: 'image', image: imageUrl },
                    ] as any,
                },
            ],
        };
        await agent.request(params, null);

        expect(requestInit).toBeDefined();
        const body = JSON.parse(requestInit?.body as string);
        const source = body.messages[0].content[1].source;

        expect(source.type).toBe('url');
        expect(source.url).toBe(imageUrl);
        expect(warnSpy).toHaveBeenCalled();
    });
});
