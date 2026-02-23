function timestamp(): string {
  return new Date().toISOString();
}

export function createLogger(context: string) {
  return {
    info(message: string, ...args: unknown[]) {
      console.log(`[${timestamp()}] [${context}] ${message}`, ...args);
    },
    error(message: string, ...args: unknown[]) {
      console.error(`[${timestamp()}] [${context}] ${message}`, ...args);
    },
  };
}
