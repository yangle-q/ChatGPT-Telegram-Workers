import type { AgentUserConfig } from '#/config';
import type { ChatAgent, ChatAgentFactory, ImageAgent, ImageAgentFactory } from './core/types';
import { CHAT_PROVIDER_FACTORIES, IMAGE_PROVIDER_FACTORIES } from './provider_factories';

interface NamedAgentFactory<AgentType> {
    name: string;
    create: (context: AgentUserConfig) => AgentType | null;
}

function loadAgentFromFactories<AgentType>(
    factories: NamedAgentFactory<AgentType>[],
    preferredName: string | null | undefined,
    context: AgentUserConfig,
): AgentType | null {
    if (preferredName) {
        const preferred = factories.find(factory => factory.name === preferredName);
        if (preferred) {
            const preferredAgent = preferred.create(context);
            if (preferredAgent) {
                return preferredAgent;
            }
        }
    }
    for (const factory of factories) {
        const agent = factory.create(context);
        if (agent) {
            return agent;
        }
    }
    return null;
}

export const CHAT_AGENT_FACTORIES: ChatAgentFactory[] = CHAT_PROVIDER_FACTORIES;

const CHAT_PROVIDER_MODEL_KEYS = new Map<string, string>(
    CHAT_PROVIDER_FACTORIES.map(factory => [factory.name, factory.modelKey]),
);

export function getChatAgentModelKey(provider: string | null | undefined): string | null {
    if (!provider) {
        return null;
    }
    return CHAT_PROVIDER_MODEL_KEYS.get(provider) || null;
}

export function loadChatLLM(context: AgentUserConfig): ChatAgent | null {
    // 找不到指定的AI，使用第一个可用的AI
    return loadAgentFromFactories(CHAT_AGENT_FACTORIES, context.AI_PROVIDER, context);
}

export const IMAGE_AGENT_FACTORIES: ImageAgentFactory[] = IMAGE_PROVIDER_FACTORIES;

const IMAGE_PROVIDER_MODEL_KEYS = new Map<string, string>(
    IMAGE_PROVIDER_FACTORIES.map(factory => [factory.name, factory.modelKey]),
);

export function getImageAgentModelKey(provider: string | null | undefined): string | null {
    if (!provider) {
        return null;
    }
    return IMAGE_PROVIDER_MODEL_KEYS.get(provider) || null;
}

export function loadImageGen(context: AgentUserConfig): ImageAgent | null {
    // 找不到指定的AI，使用第一个可用的AI
    return loadAgentFromFactories(IMAGE_AGENT_FACTORIES, context.AI_IMAGE_PROVIDER, context);
}
