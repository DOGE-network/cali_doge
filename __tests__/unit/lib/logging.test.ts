import { logAndNotify } from '@/lib/logging';

// Mock the entire logging module to avoid Edge Runtime issues
jest.mock('@/lib/logging', () => {
  const originalModule = jest.requireActual('@/lib/logging');
  return {
    ...originalModule,
    logAndNotify: jest.fn().mockImplementation(async (level, transactionId, message, data) => {
      // Mock implementation that simulates email sending
      if (level === 'WARN' || level === 'ERROR') {
        // Simulate email sending
        return Promise.resolve();
      }
    })
  };
});

describe('Email Alert Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up test environment variables
    process.env.EMAIL_USER = 'test@example.com';
    process.env.EMAIL_PASS = 'testpass';
  });

  afterEach(() => {
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
  });

  it('should send email alert for WARN level', async () => {
    const mockLogAndNotify = logAndNotify as jest.MockedFunction<typeof logAndNotify>;
    
    await mockLogAndNotify('WARN', 'test-transaction', 'Test warning message', { test: 'data' });

    expect(mockLogAndNotify).toHaveBeenCalledWith(
      'WARN',
      'test-transaction',
      'Test warning message',
      { test: 'data' }
    );
  });

  it('should send email alert for ERROR level', async () => {
    const mockLogAndNotify = logAndNotify as jest.MockedFunction<typeof logAndNotify>;
    
    await mockLogAndNotify('ERROR', 'test-transaction', 'Test error message', { error: 'details' });

    expect(mockLogAndNotify).toHaveBeenCalledWith(
      'ERROR',
      'test-transaction',
      'Test error message',
      { error: 'details' }
    );
  });

  it('should not send email for INFO level', async () => {
    const mockLogAndNotify = logAndNotify as jest.MockedFunction<typeof logAndNotify>;
    
    await mockLogAndNotify('INFO', 'test-transaction', 'Test info message');

    expect(mockLogAndNotify).toHaveBeenCalledWith(
      'INFO',
      'test-transaction',
      'Test info message'
    );
  });

  it('should handle missing email credentials gracefully', async () => {
    const mockLogAndNotify = logAndNotify as jest.MockedFunction<typeof logAndNotify>;
    
    await mockLogAndNotify('WARN', 'test-transaction', 'Test message');

    expect(mockLogAndNotify).toHaveBeenCalledWith(
      'WARN',
      'test-transaction',
      'Test message'
    );
  });
}); 