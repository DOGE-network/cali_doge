type LogLevel = 'INFO' | 'WARN' | 'ERROR';

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

  // In development, pretty print the log
  if (process.env.NODE_ENV === 'development') {
    console.log(JSON.stringify(logEntry, null, 2));
  } else {
    // In production, single line JSON for better log aggregation
    console.log(JSON.stringify(logEntry));
  }
} 