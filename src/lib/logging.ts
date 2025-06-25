import * as path from 'path';

// Only import fs in Node.js environment
let fs: any;
if (typeof window === 'undefined') {
  fs = require('fs');
}

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

  // Log WARN and above levels to file if in Node environment
  if (typeof window === 'undefined' && (level === 'WARN' || level === 'ERROR')) {
    // Use the class method directly without referencing the possibly undefined export
    NodeFileLogger.log(`${level}: ${message}`, false, level === 'ERROR');
  }
}

// Define the class without conditional export
class NodeFileLogger {
  private static _logFile: string | null = null;
  private static _logStream: NodeJS.WriteStream | null = null;
  
  private static get logFile(): string {
    if (!NodeFileLogger._logFile) {
      // Create logs directory if it doesn't exist
      const logsDir = path.join(process.cwd(), 'src/logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      // Get the script name from process.argv
      const scriptPath = process.argv[1] || 'unknown_script';
      const scriptName = path.basename(scriptPath, path.extname(scriptPath));
      
      NodeFileLogger._logFile = path.join(logsDir, `${scriptName}_${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
      
      // Initialize the log file with a header
      fs.writeFileSync(NodeFileLogger._logFile, `${scriptName} Log - ${new Date().toISOString()}\n`);
    }
    return NodeFileLogger._logFile;
  }
  
  private static get logStream(): NodeJS.WriteStream {
    if (!NodeFileLogger._logStream) {
      NodeFileLogger._logStream = fs.createWriteStream(NodeFileLogger.logFile, {
        flags: 'a',
        encoding: 'utf8',
        autoClose: true
      });
    }
    return NodeFileLogger._logStream as NodeJS.WriteStream; // Assert non-null
  }

  constructor() {
    if (typeof window !== 'undefined') throw new Error('FileLogger is only available in Node.js environment');
  }

  private static writeSync(message: string): void {
    if (!fs) throw new Error('FileLogger is only available in Node.js environment');
    
    // Write to console immediately
    process.stdout.write(message);
    
    // Write to file synchronously
    fs.appendFileSync(NodeFileLogger.logFile, message);
  }

  public static log(message: string, isSubStep = false, isError = false): void {
    const timestamp = new Date().toISOString();
    const level = isError ? 'ERROR' : 'INFO';
    const prefix = isSubStep ? '  - ' : '• ';
    const logEntry = `[${level}] [${timestamp}] ${prefix}${message}\n`;
    NodeFileLogger.writeSync(logEntry);
  }

  public static logUser(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[USER] [${timestamp}] ${message}\n`;
    NodeFileLogger.writeSync(logEntry);
  }

  public static error(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[ERROR] [${timestamp}] ${message}\n`;
    NodeFileLogger.writeSync(logEntry);
  }

  public static cleanup(): void {
    try {
      if (NodeFileLogger._logStream) {
        NodeFileLogger._logStream.end();
        NodeFileLogger._logStream.destroy();
        NodeFileLogger._logStream = null;
      }
    } catch (err) {
      // Ignore cleanup errors
    }
  }

  public static getLogFile(): string {
    return NodeFileLogger.logFile;
  }
}

// Conditionally export FileLogger
export const FileLogger = typeof window === 'undefined' ? NodeFileLogger : undefined;