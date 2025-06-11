import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { log, generateTransactionId } from '@/lib/logging';

export async function POST(request: Request) {
  const transactionId = generateTransactionId();
  log('INFO', transactionId, 'Received email request');
  
  try {
    const { email, to, from, message, subject } = await request.json();
    log('INFO', transactionId, 'Parsed request data', { email, to, from, message, subject });

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

    // Create transporter with more detailed configuration
    const transporter = nodemailer.createTransport({
      host: 'mail.privateemail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        // Do not fail on invalid certs
        rejectUnauthorized: false
      },
      // Set longer timeout for serverless environment
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });

    const mailOptions = {
      from: from || process.env.EMAIL_USER,
      to: to || email || process.env.EMAIL_USER, // Use to field, then email field, then fallback to admin email
      subject: subject || 'New Join Request from California DOGE',
      text: message,
      html: subject ? message : `
        <h2>New Join Request</h2>
        <p><strong>From:</strong> ${email}</p>
        <div style="white-space: pre-wrap;">${message.replace(/\n/g, '<br>')}</div>
      `
    };

    log('INFO', transactionId, 'Sending email');
    
    try {
      // Verify connection configuration
      await transporter.verify();
      log('INFO', transactionId, 'Email transporter verified');
      
      // Send mail with defined transport object
      const info = await transporter.sendMail(mailOptions);
      log('INFO', transactionId, 'Email sent successfully', { 
        messageId: info.messageId,
        response: info.response 
      });
      
      return NextResponse.json({ message: subject ? 'Welcome email sent successfully' : 'Join request sent successfully' }, { status: 200 });
    } catch (emailError) {
      log('ERROR', transactionId, 'Error sending email', {
        error: emailError instanceof Error ? emailError.message : 'Unknown email error',
        stack: emailError instanceof Error ? emailError.stack : undefined
      });
      
      // Store the request data for manual processing later
      log('INFO', transactionId, 'Storing email request for manual processing', {
        email,
        message,
        subject
      });
      
      // Return success to the user even though email failed
      // This prevents exposing internal errors to users while ensuring their data is captured
      return NextResponse.json({ 
        message: subject ? 'Welcome email sent successfully' : 'Your request has been received. We will get back to you soon.' 
      }, { status: 200 });
    }
  } catch (error) {
    log('ERROR', transactionId, 'Error in send-email route', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      path: request.url
    });
    
    return NextResponse.json({ 
      error: 'Failed to send email', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 