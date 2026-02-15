import { CHAT_AGENT_FACTORIES, Workers } from '@chatgpt-telegram-workers/core';
import { injectNextChatAgent } from '@chatgpt-telegram-workers/next';

injectNextChatAgent(CHAT_AGENT_FACTORIES);
export default Workers;
