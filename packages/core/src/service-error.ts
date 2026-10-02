interface ServiceErrorPayload {
  message?: unknown;
  typeKey?: unknown;
  typeName?: unknown;
  eventId?: unknown;
}

class TerminalServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TerminalServiceError';
  }
}

function collectErrorMessages(value: unknown): string[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (typeof value === 'string') {
    return [value];
  }

  if (value instanceof Error) {
    return [value.message, ...collectErrorMessages(value.cause)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectErrorMessages(entry));
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const messages: string[] = [];

    if (
      typeof record.typeKey === 'string' ||
      typeof record.typeName === 'string' ||
      typeof record.eventId === 'number' ||
      typeof record.eventId === 'string'
    ) {
      messages.push(JSON.stringify(record));
    }

    for (const key of ['message', 'body', 'responseBody', 'result']) {
      messages.push(...collectErrorMessages(record[key]));
    }

    for (const key of ['statusCode', 'status']) {
      const status = record[key];
      if (typeof status === 'number' || typeof status === 'string') {
        messages.push(String(status));
      }
    }

    return messages;
  }

  return [String(value)];
}

function parseEmbeddedJson(message: string): ServiceErrorPayload | undefined {
  const normalizedMessage = message.replace(/\uFEFF/g, '');
  let jsonStart = normalizedMessage.indexOf('{');

  while (jsonStart !== -1) {
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = jsonStart; index < normalizedMessage.length; index++) {
      const char = normalizedMessage[index];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;

        if (depth === 0) {
          try {
            return JSON.parse(normalizedMessage.slice(jsonStart, index + 1)) as ServiceErrorPayload;
          } catch {
            break;
          }
        }
      }
    }

    jsonStart = normalizedMessage.indexOf('{', jsonStart + 1);
  }

  return undefined;
}

function errorFromText(message: string): Error | undefined {
  const tfError = /\b(TF\d{4,}:.*)/i.exec(message);
  if (tfError) {
    return new TerminalServiceError(tfError[1].trim());
  }

  const httpStatusError =
    /\b(?:(?:received response|http)\s+(401|403)\b|Failed request:\s*\((401|403)\))/i.exec(message);
  if (httpStatusError) {
    return new TerminalServiceError(message.trim());
  }

  if (/\bFailed to find api location for area:\s+\w+\s+id:\s+[0-9a-f-]+/i.test(message)) {
    return new TerminalServiceError(message.trim());
  }

  if (/\berror:\s+Error:\s+Extension not published\./i.test(message)) {
    return new TerminalServiceError(message.trim());
  }

  if (/\berror:\s+Error:\s+Could not find extension version\s+\d+(?:\.\d+){0,3}\b/i.test(message)) {
    return new TerminalServiceError(message.trim());
  }

  const payload = parseEmbeddedJson(message);
  if (
    payload &&
    (typeof payload.typeKey === 'string' ||
      typeof payload.typeName === 'string' ||
      typeof payload.eventId === 'number' ||
      typeof payload.eventId === 'string')
  ) {
    return new TerminalServiceError(
      typeof payload.message === 'string' && payload.message.trim().length > 0
        ? payload.message
        : String(payload.typeKey ?? payload.typeName ?? payload.eventId)
    );
  }

  return undefined;
}

export function classifyServiceError(value: unknown): Error | undefined {
  if (value instanceof TerminalServiceError) {
    return value;
  }

  const messages = collectErrorMessages(value).filter((message) => message.trim().length > 0);

  for (const message of messages) {
    const serviceError = errorFromText(message);
    if (serviceError) {
      return serviceError;
    }
  }

  if (messages.some((message) => /^(401|403)$/.test(message.trim()))) {
    const status = messages.find((message) => /^(401|403)$/.test(message.trim()))?.trim();
    const details = messages
      .filter((message) => message.trim() !== status)
      .join(' ')
      .trim();
    return new TerminalServiceError([status, details].filter(Boolean).join(' '));
  }

  return undefined;
}
