import { OpenAICompatibilityAgent } from '#/agent/openai_compatibility';

const OPENAI_COMPAT_CHAT_PROVIDER_CONFIG = [
    {
        name: 'cohere',
        fields: {
            base: 'COHERE_API_BASE',
            key: 'COHERE_API_KEY',
            model: 'COHERE_CHAT_MODEL',
            modelsList: 'COHERE_CHAT_MODELS_LIST',
            extraParams: 'COHERE_CHAT_EXTRA_PARAMS',
        },
    },
    {
        name: 'mistral',
        fields: {
            base: 'MISTRAL_API_BASE',
            key: 'MISTRAL_API_KEY',
            model: 'MISTRAL_CHAT_MODEL',
            modelsList: 'MISTRAL_CHAT_MODELS_LIST',
            extraParams: 'MISTRAL_CHAT_EXTRA_PARAMS',
        },
    },
    {
        name: 'deepseek',
        fields: {
            base: 'DEEPSEEK_API_BASE',
            key: 'DEEPSEEK_API_KEY',
            model: 'DEEPSEEK_CHAT_MODEL',
            modelsList: 'DEEPSEEK_CHAT_MODELS_LIST',
            extraParams: 'DEEPSEEK_CHAT_EXTRA_PARAMS',
        },
    },
    {
        name: 'groq',
        fields: {
            base: 'GROQ_API_BASE',
            key: 'GROQ_API_KEY',
            model: 'GROQ_CHAT_MODEL',
            modelsList: 'GROQ_CHAT_MODELS_LIST',
            extraParams: 'GROQ_CHAT_EXTRA_PARAMS',
        },
    },
    {
        name: 'xai',
        fields: {
            base: 'XAI_API_BASE',
            key: 'XAI_API_KEY',
            model: 'XAI_CHAT_MODEL',
            modelsList: 'XAI_CHAT_MODELS_LIST',
            extraParams: 'XAI_CHAT_EXTRA_PARAMS',
        },
    },
] as const;

export const OPENAI_COMPAT_CHAT_PROVIDER_NAMES = OPENAI_COMPAT_CHAT_PROVIDER_CONFIG.map(item => item.name);

export const OPENAI_COMPAT_CHAT_AGENTS = OPENAI_COMPAT_CHAT_PROVIDER_CONFIG.map(item => new OpenAICompatibilityAgent(item.name, {
    ...item.fields,
}));
