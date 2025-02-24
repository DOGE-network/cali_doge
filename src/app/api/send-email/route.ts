import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { log, generateTransactionId } from '@/lib/logging';

export async function POST(request: Request) {
  const transactionId = generateTransactionId();
  log('INFO', transactionId, 'Received join request');
  
  try {
    const { email, message } = await request.json();
    log('INFO', transactionId, 'Parsed request data', { email, message });

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      log('ERROR', transactionId, 'Email configuration error', {
        error: 'Missing email credentials',
        missingEnvVars: {
          EMAIL_USER: !process.env.EMAIL_USER,
          EMAIL_PASS: !process.env.EMAIL_PASS
        }
      });
      throw new Error('Email configuration is incomplete');
    }

    const transporter = nodemailer.createTransport({
      host: 'mail.privateemail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to the same email address
      subject: 'New Join Request from California DOGE',
      text: `New join request:\n\n${message}`,
      html: `
        <h2>New Join Request</h2>
        <div style="white-space: pre-wrap;">${message.replace(/\n/g, '<br>')}</div>
      `
    };

    log('INFO', transactionId, 'Sending email');
    await transporter.sendMail(mailOptions);
    log('INFO', transactionId, 'Email sent successfully');

    return NextResponse.json({ message: 'Join request sent successfully' }, { status: 200 });
  } catch (error) {
    log('ERROR', transactionId, 'Error in send-email route', {
      error,
      path: request.url
    });
    return NextResponse.json({ 
      error: 'Failed to send join request', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 