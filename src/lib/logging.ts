import * as fs from 'fs';
import * as path from 'path';

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

export class FileLogger {
  private logFile: string;
  private logStream: fs.WriteStream;

  constructor(logDir: string, prefix: string) {
    // Create log directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Generate log file name with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = path.join(logDir, `${prefix}_${timestamp}.log`);

    // Create write stream in synchronous append mode
    this.logStream = fs.createWriteStream(this.logFile, {
      flags: 'a',
      encoding: 'utf8',
      autoClose: true
    });

    // Initialize log file
    this.writeSync(`Process Budgets Log - ${new Date().toISOString()}\n`);

    // Setup cleanup on process exit
    process.on('exit', () => this.cleanup());
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
    process.on('uncaughtException', (err) => {
      this.error(`Uncaught Exception: ${err.message}`);
      this.error(err.stack || '');
      this.cleanup();
      process.exit(1);
    });
  }

  private writeSync(message: string): void {
    // Write to console immediately
    process.stdout.write(message);
    
    // Write to file synchronously
    fs.appendFileSync(this.logFile, message);
  }

  public log(message: string, isSubStep = false, isError = false): void {
    const timestamp = new Date().toISOString();
    const level = isError ? 'ERROR' : 'INFO';
    const prefix = isSubStep ? '  - ' : '• ';
    const logEntry = `[${level}] [${timestamp}] ${prefix}${message}\n`;
    this.writeSync(logEntry);
  }

  public logUser(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[USER] [${timestamp}] ${message}\n`;
    this.writeSync(logEntry);
  }

  public error(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[ERROR] [${timestamp}] ${message}\n`;
    this.writeSync(logEntry);
  }

  public cleanup(): void {
    try {
      this.logStream.end();
      this.logStream.destroy();
    } catch (err) {
      // Ignore cleanup errors
    }
  }

  public getLogFile(): string {
    return this.logFile;
  }
} 