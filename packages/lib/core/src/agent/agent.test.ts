import type { LLMChatParams } from './core/types';
import { ENV } from '#/config';
import { loadChatLLM } from './agent';
import '#/config/env.test';

describe('agent', () => {
    it.skip('should load agent', async () => {
        const agent = loadChatLLM({
            ...ENV.USER_CONFIG,
            AI_PROVIDER: 'cohere',
        });
        const params: LLMChatParams = {
            prompt: 'You are a useful assistant.',
            messages: [
                {
                    role: 'user',
                    content: 'What is your name?',
                },
            ],
        };
        expect(agent?.name).toBe('cohere');
        const res = await agent?.request(params, async (text: string) => {
            console.log(text);
        });
        expect(res).toBeDefined();
    });
});
