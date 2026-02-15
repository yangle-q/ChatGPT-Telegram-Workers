import type { WorkerContext } from '#/config';
import type { ChatAgent, HistoryItem, HistoryModifier, LLMChatParams, UserMessageItem } from './types';
import { ENV } from '#/config';
import { extractTextContent } from './utils';

function tokensCounter(): (text: string) => number {
    return (text) => {
        return text.length;
    };
}

function trimHistory(list: HistoryItem[], initLength: number, maxLength: number, maxToken: number, counter: (text: string) => number): HistoryItem[] {
    let history = list;
    // 历史记录超出长度需要裁剪, 小于0不裁剪
    if (maxLength >= 0 && history.length > maxLength) {
        history = history.slice(-maxLength);
    }
    // 处理token长度问题, 小于0不裁剪
    if (maxToken > 0) {
        let tokenLength = initLength;
        for (let i = history.length - 1; i >= 0; i--) {
            const historyItem = history[i];
            let length = 0;
            if (historyItem.content) {
                length = counter(extractTextContent(historyItem));
            } else {
                historyItem.content = '';
            }
            // 如果最大长度超过maxToken,裁剪history
            tokenLength += length;
            if (tokenLength > maxToken) {
                history = history.slice(i + 1);
                break;
            }
        }
    }
    return history;
}

function buildHistoryMessage(params: UserMessageItem): UserMessageItem {
    if (!ENV.HISTORY_IMAGE_PLACEHOLDER || !Array.isArray(params.content)) {
        return params;
    }
    const imageCount = params.content.filter(item => item.type === 'image').length;
    if (imageCount <= 0) {
        return params;
    }
    const content = params.content.filter(item => item.type !== 'image');
    let textIndex = -1;
    for (let i = content.length - 1; i >= 0; i--) {
        if (content[i].type === 'text') {
            textIndex = i;
            break;
        }
    }
    if (textIndex < 0) {
        return params;
    }
    const textPart = content[textIndex];
    if (textPart.type !== 'text') {
        return params;
    }
    const nextContent = [...content];
    nextContent[textIndex] = {
        ...textPart,
        text: `${textPart.text}${` ${ENV.HISTORY_IMAGE_PLACEHOLDER}`.repeat(imageCount)}`,
    };
    return {
        ...params,
        content: nextContent,
    };
}

async function saveHistory(historyKey: string, history: HistoryItem[], params: UserMessageItem, responses: HistoryItem[]): Promise<void> {
    const historyMessage = buildHistoryMessage(params);
    await ENV.DATABASE.put(historyKey, JSON.stringify([...history, historyMessage, ...responses])).catch(console.error);
}

async function loadHistory(key: string): Promise<HistoryItem[]> {
    // 加载历史记录
    let history = [];
    try {
        history = JSON.parse(await ENV.DATABASE.get(key));
    } catch (e) {
        console.error(e);
    }
    if (!history || !Array.isArray(history)) {
        history = [];
    }

    const counter = tokensCounter();

    // 裁剪
    if (ENV.AUTO_TRIM_HISTORY && ENV.MAX_HISTORY_LENGTH > 0) {
        history = trimHistory(history, 0, ENV.MAX_HISTORY_LENGTH, ENV.MAX_TOKEN_LENGTH, counter);
    }

    return history;
}

export type StreamResultHandler = (text: string) => Promise<any>;

export async function requestCompletionsFromLLM(params: UserMessageItem | null, context: WorkerContext, agent: ChatAgent, modifier: HistoryModifier | null, onStream: StreamResultHandler | null): Promise<string> {
    const historyDisable = ENV.AUTO_TRIM_HISTORY && ENV.MAX_HISTORY_LENGTH <= 0;
    const historyKey = context.SHARE_CONTEXT.chatHistoryKey;
    if (!historyKey) {
        throw new Error('History key not found');
    }
    let history = await loadHistory(historyKey);
    if (modifier) {
        const modifierData = modifier(history, params || null);
        history = modifierData.history;
        params = modifierData.message;
    }
    if (!params) {
        throw new Error('Message is empty');
    }
    const llmParams: LLMChatParams = {
        prompt: context.USER_CONFIG.SYSTEM_INIT_MESSAGE || undefined,
        messages: [...history, params],
    };
    const { text, responses } = await agent.request(llmParams, context.USER_CONFIG, onStream);
    if (!historyDisable) {
        await saveHistory(historyKey, history, params, responses);
    }
    return text;
}
