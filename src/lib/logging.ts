type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export function generateTransactionId(): string {
  return `txn-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

export function log(level: LogLevel, transactionId: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    transactionId,
    message,
    ...(data && { data })
  };

  // Always log to console
  console.log(JSON.stringify(logEntry, null, 2));
} 