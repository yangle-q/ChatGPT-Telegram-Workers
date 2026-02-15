import type { AgentUserConfig } from '#/config';
import type { ChatAgent, ImageAgent } from './types';
import { Cohere, DeepSeek, Groq, Mistral, XAi } from '#/agent/openai_agents';
import { Anthropic } from './anthropic';
import { AzureChatAI, AzureImageAI } from './azure';
import { Gemini } from './gemini';
import { Dalle, OpenAI } from './openai';
import { WorkersChat, WorkersImage } from './workersai';

interface NamedAgent {
    name: string;
    enable: (context: AgentUserConfig) => boolean;
}

function loadAgent<T extends NamedAgent>(agents: T[], preferredName: string | null | undefined, context: AgentUserConfig): T | null {
    if (preferredName) {
        const preferred = agents.find(agent => agent.name === preferredName);
        if (preferred) {
            return preferred;
        }
    }
    return agents.find(agent => agent.enable(context)) || null;
}

export const CHAT_AGENTS: ChatAgent[] = [
    new OpenAI(),
    new Anthropic(),
    new AzureChatAI(),
    new WorkersChat(),
    new Cohere(),
    new Gemini(),
    new Mistral(),
    new DeepSeek(),
    new Groq(),
    new XAi(),
];

export function loadChatLLM(context: AgentUserConfig): ChatAgent | null {
    // 找不到指定的AI，使用第一个可用的AI
    return loadAgent(CHAT_AGENTS, context.AI_PROVIDER, context);
}

export const IMAGE_AGENTS: ImageAgent[] = [
    new AzureImageAI(),
    new Dalle(),
    new WorkersImage(),
];

export function loadImageGen(context: AgentUserConfig): ImageAgent | null {
    // 找不到指定的AI，使用第一个可用的AI
    return loadAgent(IMAGE_AGENTS, context.AI_IMAGE_PROVIDER, context);
}
