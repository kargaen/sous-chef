export interface ContextWindowMessage {
  id?: string;
  role: string;
  content: string;
  createdAt?: string | number | Date;
  estimatedTokens?: number;
}

export interface BuildContextWindowOptions {
  maxTokens: number;
  reservedTokens?: number;
  preserveMostRecent?: number;
  alwaysPreserveRoles?: string[];
}

const DEFAULT_CHARS_PER_TOKEN = 4;
const DEFAULT_MAX_CONTEXT_TOKENS = 3_500;

export const estimateTokensFromText = (text: string): number => {
  if (text.length === 0) return 0;

  return Math.ceil(text.length / DEFAULT_CHARS_PER_TOKEN);
};

export const estimateMessageTokens = (
  message: ContextWindowMessage,
): number => {
  return message.estimatedTokens ?? estimateTokensFromText(message.content);
};

const getBudget = ({
  maxTokens,
  reservedTokens = 0,
}: BuildContextWindowOptions): number => {
  return Math.max(0, maxTokens - reservedTokens);
};

export const buildContextWindow = <TMessage extends ContextWindowMessage>(
  messages: TMessage[],
  options: BuildContextWindowOptions,
): TMessage[] => {
  const { preserveMostRecent = 2, alwaysPreserveRoles = ["system"] } = options;

  const budget = getBudget(options);
  const preserved = new Set<TMessage>();

  for (const message of messages) {
    if (alwaysPreserveRoles.includes(message.role)) {
      preserved.add(message);
    }
  }

  const recentMessages = messages.slice(
    Math.max(0, messages.length - preserveMostRecent),
  );

  for (const message of recentMessages) {
    preserved.add(message);
  }

  let usedTokens = [...preserved].reduce(
    (sum, message) => sum + estimateMessageTokens(message),
    0,
  );

  const selected = new Set<TMessage>(preserved);

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (selected.has(message)) continue;

    const messageTokens = estimateMessageTokens(message);

    if (usedTokens + messageTokens > budget) continue;

    selected.add(message);
    usedTokens += messageTokens;
  }

  return messages.filter((message) => selected.has(message));
};

export const trimContextWindow = <TMessage extends ContextWindowMessage>(
  messages: TMessage[],
  maxTokens = DEFAULT_MAX_CONTEXT_TOKENS,
): TMessage[] => {
  return buildContextWindow(messages, {
    maxTokens,
    preserveMostRecent: 8,
    alwaysPreserveRoles: ["system"],
  });
};

export const getContextTokenCount = (
  messages: ContextWindowMessage[],
): number => {
  return messages.reduce(
    (sum, message) => sum + estimateMessageTokens(message),
    0,
  );
};
