// Only import Node.js modules in Node.js environment (not Edge Runtime)
let nodemailer: any;

// Check if we're in a Node.js environment (not Edge Runtime)
// Use a safer approach that doesn't trigger Edge Runtime warnings
const isNodeEnv = typeof window === 'undefined' && 
                  typeof process !== 'undefined' && 
                  typeof process.versions === 'object' &&
                  process.versions.node &&
                  process.env.NEXT_RUNTIME !== 'edge';

// Only import nodemailer in Node.js environment
if (isNodeEnv) {
  try {
    // Use dynamic import to avoid bundling in client builds
    nodemailer = require('nodemailer');
  } catch {
    // Ignore module loading errors in Edge Runtime
    console.warn('Node.js modules not available in this environment');
  }
}

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export function generateTransactionId(): string {
  return `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Simple console logging for Edge Runtime compatibility
export function log(level: LogLevel, component: string, message: string, data?: any) {

  // Always log to console for Edge Runtime compatibility
  console.log(`[${level}] ${component}: ${message}`, data || '');
}

async function sendAdminEmail(subject: string, message: string) {
  // Only send email in Node.js environment
  if (!isNodeEnv || !nodemailer) {
    console.warn('Email sending not available in this environment');
    return;
  }
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email credentials missing, cannot send admin notification');
    return;
  }
  
  try {
    const transporter = nodemailer.createTransport({
      host: 'mail.privateemail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'info@cali-doge.org',
      subject,
      text: message
    });
  } catch (error) {
    console.error('Failed to send admin email:', error);
  }
}

export async function sendEmailAlert(subject: string, message: string) {
  // Only send email in Node.js environment
  if (!isNodeEnv || !nodemailer) {
    console.warn('Email sending not available in this environment');
    return;
  }
  
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email credentials missing, cannot send admin notification');
    return;
  }
  
  try {
    const transporter = nodemailer.createTransport({
      host: 'mail.privateemail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'info@cali-doge.org',
      subject,
      text: message
    });
  } catch (error) {
    console.error('Failed to send admin email:', error);
  }
}

export async function logAndNotify(level: LogLevel, transactionId: string, message: string, data?: any) {
  log(level, 'unknown', message, data); // Assuming 'unknown' component for now
  if (isNodeEnv && (level === 'WARN' || level === 'ERROR')) {
    let details = '';
    if (data) {
      details = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    }
    await sendAdminEmail(
      `[${level}] ${message}`,
      `Transaction ID: ${transactionId}\n${message}\n${details}`
    );
  }
}