import type { I18n } from '#/i18n';
import type { APIGuardBinding, KVNamespaceBinding, WorkerAIBinding } from './binding';
import type { AgentUserConfig, AgentUserConfigKey } from './config';
import { loadI18n } from '#/i18n';
import {
    AgentShareConfig,
    AnthropicConfig,
    AzureConfig,
    CohereConfig,
    DallEConfig,
    DeepSeekConfig,
    DefineKeys,
    EnvironmentConfig,
    GeminiConfig,
    GroqConfig,
    MistralConfig,
    OpenAIConfig,
    WorkersConfig,
    XAIConfig,
} from './config';
import { ConfigMerger } from './merger';
import { BUILD_TIMESTAMP, BUILD_VERSION } from './version';

export interface CommandConfig {
    value: string;
    description?: string | null;
    scope?: string[] | null;
}

function createAgentUserConfig(): AgentUserConfig {
    return Object.assign(
        {},
        new DefineKeys(),
        new AgentShareConfig(),
        new OpenAIConfig(),
        new DallEConfig(),
        new AzureConfig(),
        new WorkersConfig(),
        new GeminiConfig(),
        new MistralConfig(),
        new CohereConfig(),
        new AnthropicConfig(),
        new DeepSeekConfig(),
        new GroqConfig(),
        new XAIConfig(),
    );
}

function fixApiBase(base: string): string {
    return base.replace(/\/+$/, '');
}

export type CustomMessageRender = (mode: string | null, message: string) => string;

class Environment extends EnvironmentConfig {
    // -- 版本数据 --
    //
    // 当前版本
    BUILD_TIMESTAMP = BUILD_TIMESTAMP;
    // 当前版本 commit id
    BUILD_VERSION = BUILD_VERSION;

    // -- 基础配置 --
    I18N: I18n = loadI18n();
    readonly PLUGINS_ENV: Record<string, string> = {};
    readonly USER_CONFIG: AgentUserConfig = createAgentUserConfig();
    readonly CUSTOM_COMMAND: Record<string, CommandConfig> = {};
    readonly PLUGINS_COMMAND: Record<string, CommandConfig> = {};

    AI_BINDING: WorkerAIBinding | null = null;
    API_GUARD: APIGuardBinding | null = null;

    DATABASE: KVNamespaceBinding = null as any;

    CUSTOM_MESSAGE_RENDER: CustomMessageRender | null = null;

    constructor() {
        super();
        this.merge = this.merge.bind(this);
    }

    merge(source: any) {
        // 全局对象
        this.AI_BINDING = source.AI;
        this.DATABASE = source.DATABASE;
        this.API_GUARD = source.API_GUARD;

        // 绑定自定义命令
        this.mergeCommands(
            'CUSTOM_COMMAND_',
            'COMMAND_DESCRIPTION_',
            'COMMAND_SCOPE_',
            source,
            this.CUSTOM_COMMAND,
        );

        // 绑定插件命令
        this.mergeCommands(
            'PLUGIN_COMMAND_',
            'PLUGIN_DESCRIPTION_',
            'PLUGIN_SCOPE_',
            source,
            this.PLUGINS_COMMAND,
        );

        // 绑定插件环境变量
        const pluginEnvPrefix = 'PLUGIN_ENV_';
        for (const key of Object.keys(source)) {
            if (key.startsWith(pluginEnvPrefix)) {
                const plugin = key.substring(pluginEnvPrefix.length);
                this.PLUGINS_ENV[plugin] = source[key];
            }
        }

        // 合并环境变量
        ConfigMerger.merge(this, source, [
            'BUILD_TIMESTAMP',
            'BUILD_VERSION',
            'I18N',
            'PLUGINS_ENV',
            'USER_CONFIG',
            'CUSTOM_COMMAND',
            'PLUGINS_COMMAND',
            'DATABASE',
            'API_GUARD',
        ]);
        ConfigMerger.merge(this.USER_CONFIG, source);
        this.fixAgentUserConfigApiBase();
        this.USER_CONFIG.DEFINE_KEYS = [];
        this.I18N = loadI18n(this.LANGUAGE.toLowerCase());
    }

    private mergeCommands(prefix: string, descriptionPrefix: string, scopePrefix: string, source: any, target: Record<string, CommandConfig>) {
        for (const key of Object.keys(source)) {
            if (key.startsWith(prefix)) {
                const cmd = key.substring(prefix.length);
                target[`/${cmd}`] = {
                    value: source[key],
                    description: source[`${descriptionPrefix}${cmd}`],
                    scope: source[`${scopePrefix}${cmd}`]?.split(',').map((s: string) => s.trim()),
                };
            }
        }
    }

    private fixAgentUserConfigApiBase() {
        const keys: AgentUserConfigKey[] = [
            'OPENAI_API_BASE',
            'GOOGLE_API_BASE',
            'MISTRAL_API_BASE',
            'COHERE_API_BASE',
            'ANTHROPIC_API_BASE',
            'DEEPSEEK_API_BASE',
            'GROQ_API_BASE',
            'XAI_API_BASE',
        ];
        for (const key of keys) {
            const base = this.USER_CONFIG[key];
            if (this.USER_CONFIG[key] && typeof base === 'string') {
                this.USER_CONFIG[key] = fixApiBase(base) as any;
            }
        }
        this.TELEGRAM_API_DOMAIN = fixApiBase(this.TELEGRAM_API_DOMAIN);
    }
}

export const ENV = new Environment();
