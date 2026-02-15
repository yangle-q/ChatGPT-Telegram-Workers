import type { AgentUserConfig } from '#/config';
import type {
    AdapterMessage,
    CoreAssistantMessage,
    CoreSystemMessage,
    CoreUserMessage,
    DataContent,
    FilePart,
    ImagePart,
    TextPart,
} from './message';
//  当使用 `ai` 包时，取消注释以下行并注释掉上一行
// import type { CoreAssistantMessage, CoreSystemMessage, CoreToolMessage, CoreUserMessage, DataContent } from 'ai';

export type DataItemContent = DataContent;
export type UserContentPart = TextPart | ImagePart | FilePart;

export type SystemMessageItem = CoreSystemMessage;
export type UserMessageItem = CoreUserMessage;
export type AssistantMessageItem = CoreAssistantMessage;
export type ToolMessageItem = AdapterMessage<'tool', any>;

export type ResponseMessage = AssistantMessageItem | ToolMessageItem;
export type HistoryItem = SystemMessageItem | UserMessageItem | AssistantMessageItem | ToolMessageItem;

export interface HistoryModifierResult {
    history: HistoryItem[];
    message: CoreUserMessage;
}

export interface LLMChatParams {
    prompt?: string;
    messages: HistoryItem[];
}

export interface ChatAgentResponse {
    text: string;
    responses: ResponseMessage[];
}

export type ChatStreamTextHandler = (text: string) => Promise<any>;
export type HistoryModifier = (history: HistoryItem[], message: UserMessageItem | null) => HistoryModifierResult;

export type ChatAgentRequest = (params: LLMChatParams, onStream: ChatStreamTextHandler | null) => Promise<ChatAgentResponse>;
export type ImageAgentRequest = (prompt: string) => Promise<string | Blob>;

export interface Agent<AgentRequest> {
    name: string;
    model: string | null;
    modelList: () => Promise<string[]>;
    request: AgentRequest;
}

export interface ChatAgent extends Agent<ChatAgentRequest> {}

export interface ImageAgent extends Agent<ImageAgentRequest> {}

export interface AgentFactory<AgentType> {
    name: string;
    create: (context: AgentUserConfig) => AgentType | null;
}

export interface ChatAgentFactory extends AgentFactory<ChatAgent> {}

export interface ImageAgentFactory extends AgentFactory<ImageAgent> {}
