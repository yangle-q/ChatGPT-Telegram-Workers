import type { AgentUserConfig } from '#/config';
import type { ChatAgent, ImageAgent } from './core/types';
import {
    createAnthropicSettings,
    createAzureChatSettings,
    createAzureImageSettings,
    createDallESettings,
    createGeminiSettings,
    createOpenAISettings,
    createWorkersChatSettings,
    createWorkersImageSettings,
    isWorkersEnabled,
    OPENAI_COMPAT_CHAT_PROVIDER_CONFIG,
} from './provider_settings';
import { Anthropic } from './providers/anthropic';
import { AzureChatAI, AzureImageAI } from './providers/azure';
import { Gemini } from './providers/gemini';
import { Dalle, defaultOpenAIRequestBuilder, ImageSupportFormat, OpenAI } from './providers/openai';
import { WorkersChat, WorkersImage } from './providers/workers';

export interface ProviderFactory<AgentType> {
    name: string;
    modelKey: string;
    create: (context: AgentUserConfig) => AgentType | null;
}

export const CHAT_PROVIDER_FACTORIES: ProviderFactory<ChatAgent>[] = [
    {
        name: 'openai',
        modelKey: 'OPENAI_CHAT_MODEL',
        create: (context: AgentUserConfig): ChatAgent | null => {
            if (context.OPENAI_API_KEY.length <= 0) {
                return null;
            }
            const settings = createOpenAISettings(context);
            if (!settings.key) {
                return null;
            }
            return new OpenAI(
                'openai',
                settings,
                defaultOpenAIRequestBuilder('/chat/completions', [ImageSupportFormat.URL, ImageSupportFormat.BASE64]),
            );
        },
    },
    {
        name: 'anthropic',
        modelKey: 'ANTHROPIC_CHAT_MODEL',
        create: (context: AgentUserConfig): ChatAgent | null => {
            if (!context.ANTHROPIC_API_KEY) {
                return null;
            }
            return new Anthropic(createAnthropicSettings(context));
        },
    },
    {
        name: 'azure',
        modelKey: 'AZURE_CHAT_MODEL',
        create: (context: AgentUserConfig): ChatAgent | null => {
            if (!(context.AZURE_API_KEY && context.AZURE_RESOURCE_NAME)) {
                return null;
            }
            return new AzureChatAI(createAzureChatSettings(context));
        },
    },
    {
        name: 'workers',
        modelKey: 'WORKERS_CHAT_MODEL',
        create: (context: AgentUserConfig): ChatAgent | null => {
            if (!isWorkersEnabled(context)) {
                return null;
            }
            return new WorkersChat(createWorkersChatSettings(context));
        },
    },
    {
        name: 'gemini',
        modelKey: 'GOOGLE_CHAT_MODEL',
        create: (context: AgentUserConfig): ChatAgent | null => {
            if (!context.GOOGLE_API_KEY) {
                return null;
            }
            return new Gemini(createGeminiSettings(context));
        },
    },
    ...OPENAI_COMPAT_CHAT_PROVIDER_CONFIG.map((config) => {
        return {
            name: config.name,
            modelKey: config.modelKey,
            create: (context: AgentUserConfig): ChatAgent | null => {
                const settings = config.createSettings(context);
                if (!settings.key) {
                    return null;
                }
                return new OpenAI(config.name, settings);
            },
        };
    }),
];

export const IMAGE_PROVIDER_FACTORIES: ProviderFactory<ImageAgent>[] = [
    {
        name: 'azure',
        modelKey: 'AZURE_IMAGE_MODEL',
        create: (context: AgentUserConfig): ImageAgent | null => {
            if (!(context.AZURE_API_KEY && context.AZURE_RESOURCE_NAME)) {
                return null;
            }
            return new AzureImageAI(createAzureImageSettings(context));
        },
    },
    {
        name: 'openai',
        modelKey: 'DALL_E_MODEL',
        create: (context: AgentUserConfig): ImageAgent | null => {
            if (context.OPENAI_API_KEY.length <= 0) {
                return null;
            }
            return new Dalle(createDallESettings(context));
        },
    },
    {
        name: 'workers',
        modelKey: 'WORKERS_IMAGE_MODEL',
        create: (context: AgentUserConfig): ImageAgent | null => {
            if (!isWorkersEnabled(context)) {
                return null;
            }
            return new WorkersImage(createWorkersImageSettings(context));
        },
    },
];
