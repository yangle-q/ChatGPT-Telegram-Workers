import type { AgentUserConfig } from '#/config';
import type { AnthropicSettings } from './providers/anthropic';
import type { AzureChatSettings, AzureImageSettings } from './providers/azure';
import type { GeminiSettings } from './providers/gemini';
import type { DallESettings, OpenAICompatibleSettings } from './providers/openai';
import type { WorkersChatSettings, WorkersImageSettings } from './providers/workers';
import { ENV } from '#/config';

export interface OpenAICompatProviderConfig {
    name: string;
    modelKey: string;
    createSettings: (context: AgentUserConfig) => OpenAICompatibleSettings;
}

export function isWorkersEnabled(context: AgentUserConfig): boolean {
    if (ENV.AI_BINDING) {
        return true;
    }
    return !!(context.CLOUDFLARE_ACCOUNT_ID && context.CLOUDFLARE_TOKEN);
}

function randomOpenAIApiKey(keys: string[]): string | null {
    const length = keys.length;
    if (length <= 0) {
        return null;
    }
    return keys[Math.floor(Math.random() * length)];
}

export function createOpenAISettings(context: AgentUserConfig): OpenAICompatibleSettings {
    return {
        base: context.OPENAI_API_BASE,
        key: randomOpenAIApiKey(context.OPENAI_API_KEY),
        model: context.OPENAI_CHAT_MODEL,
        modelsList: context.OPENAI_CHAT_MODELS_LIST,
        extraParams: context.OPENAI_API_EXTRA_PARAMS || undefined,
    };
}

export function createDallESettings(context: AgentUserConfig): DallESettings {
    return {
        apiBase: context.OPENAI_API_BASE,
        apiKeys: context.OPENAI_API_KEY,
        model: context.DALL_E_MODEL,
        modelsList: context.DALL_E_MODELS_LIST,
        imageSize: context.DALL_E_IMAGE_SIZE,
        imageQuality: context.DALL_E_IMAGE_QUALITY,
        imageStyle: context.DALL_E_IMAGE_STYLE,
    };
}

export function createAzureChatSettings(context: AgentUserConfig): AzureChatSettings {
    return {
        apiKey: context.AZURE_API_KEY,
        resourceName: context.AZURE_RESOURCE_NAME,
        chatModel: context.AZURE_CHAT_MODEL,
        apiVersion: context.AZURE_API_VERSION,
        chatModelsList: context.AZURE_CHAT_MODELS_LIST,
        chatExtraParams: context.AZURE_CHAT_EXTRA_PARAMS || undefined,
    };
}

export function createAzureImageSettings(context: AgentUserConfig): AzureImageSettings {
    return {
        apiKey: context.AZURE_API_KEY,
        resourceName: context.AZURE_RESOURCE_NAME,
        imageModel: context.AZURE_IMAGE_MODEL,
        apiVersion: context.AZURE_API_VERSION,
        imageSize: context.DALL_E_IMAGE_SIZE,
        imageStyle: context.DALL_E_IMAGE_STYLE,
        imageQuality: context.DALL_E_IMAGE_QUALITY,
    };
}

export function createAnthropicSettings(context: AgentUserConfig): AnthropicSettings {
    return {
        apiKey: context.ANTHROPIC_API_KEY,
        apiBase: context.ANTHROPIC_API_BASE,
        apiVersion: context.ANTHROPIC_API_VERSION,
        apiBeta: context.ANTHROPIC_API_BETA,
        chatModel: context.ANTHROPIC_CHAT_MODEL,
        chatModelsList: context.ANTHROPIC_CHAT_MODELS_LIST,
        chatExtraParams: context.ANTHROPIC_CHAT_EXTRA_PARAMS || undefined,
    };
}

export function createGeminiSettings(context: AgentUserConfig): GeminiSettings {
    return {
        apiBase: context.GOOGLE_API_BASE,
        apiKey: context.GOOGLE_API_KEY,
        chatModel: context.GOOGLE_CHAT_MODEL,
        chatModelsList: context.GOOGLE_CHAT_MODELS_LIST,
        chatExtraParams: context.GOOGLE_CHAT_EXTRA_PARAMS || undefined,
    };
}

export function createWorkersChatSettings(context: AgentUserConfig): WorkersChatSettings {
    return {
        accountId: context.CLOUDFLARE_ACCOUNT_ID,
        token: context.CLOUDFLARE_TOKEN,
        model: context.WORKERS_CHAT_MODEL,
        modelsList: context.WORKERS_CHAT_MODELS_LIST,
        extraParams: context.WORKERS_CHAT_EXTRA_PARAMS || undefined,
    };
}

export function createWorkersImageSettings(context: AgentUserConfig): WorkersImageSettings {
    return {
        accountId: context.CLOUDFLARE_ACCOUNT_ID,
        token: context.CLOUDFLARE_TOKEN,
        model: context.WORKERS_IMAGE_MODEL,
        modelsList: context.WORKERS_IMAGE_MODELS_LIST,
    };
}

export const OPENAI_COMPAT_CHAT_PROVIDER_CONFIG: OpenAICompatProviderConfig[] = [
    {
        name: 'cohere',
        modelKey: 'COHERE_CHAT_MODEL',
        createSettings: (context: AgentUserConfig): OpenAICompatibleSettings => ({
            base: context.COHERE_API_BASE,
            key: context.COHERE_API_KEY,
            model: context.COHERE_CHAT_MODEL,
            modelsList: context.COHERE_CHAT_MODELS_LIST,
            extraParams: context.COHERE_CHAT_EXTRA_PARAMS || undefined,
        }),
    },
    {
        name: 'mistral',
        modelKey: 'MISTRAL_CHAT_MODEL',
        createSettings: (context: AgentUserConfig): OpenAICompatibleSettings => ({
            base: context.MISTRAL_API_BASE,
            key: context.MISTRAL_API_KEY,
            model: context.MISTRAL_CHAT_MODEL,
            modelsList: context.MISTRAL_CHAT_MODELS_LIST,
            extraParams: context.MISTRAL_CHAT_EXTRA_PARAMS || undefined,
        }),
    },
    {
        name: 'deepseek',
        modelKey: 'DEEPSEEK_CHAT_MODEL',
        createSettings: (context: AgentUserConfig): OpenAICompatibleSettings => ({
            base: context.DEEPSEEK_API_BASE,
            key: context.DEEPSEEK_API_KEY,
            model: context.DEEPSEEK_CHAT_MODEL,
            modelsList: context.DEEPSEEK_CHAT_MODELS_LIST,
            extraParams: context.DEEPSEEK_CHAT_EXTRA_PARAMS || undefined,
        }),
    },
    {
        name: 'groq',
        modelKey: 'GROQ_CHAT_MODEL',
        createSettings: (context: AgentUserConfig): OpenAICompatibleSettings => ({
            base: context.GROQ_API_BASE,
            key: context.GROQ_API_KEY,
            model: context.GROQ_CHAT_MODEL,
            modelsList: context.GROQ_CHAT_MODELS_LIST,
            extraParams: context.GROQ_CHAT_EXTRA_PARAMS || undefined,
        }),
    },
    {
        name: 'xai',
        modelKey: 'XAI_CHAT_MODEL',
        createSettings: (context: AgentUserConfig): OpenAICompatibleSettings => ({
            base: context.XAI_API_BASE,
            key: context.XAI_API_KEY,
            model: context.XAI_CHAT_MODEL,
            modelsList: context.XAI_CHAT_MODELS_LIST,
            extraParams: context.XAI_CHAT_EXTRA_PARAMS || undefined,
        }),
    },
];
