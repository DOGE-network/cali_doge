'use client';

import { useState } from 'react';

interface WhistleblowerFormProps {
  className?: string;
}

export default function WhistleblowerForm({ className = '' }: WhistleblowerFormProps) {
  const [formData, setFormData] = useState({
    reportType: '',
    department: '',
    description: '',
    isAnonymous: false
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      // Send email notification
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: 'info@cali-doge.org',
          from: 'info@cali-doge.org',
          subject: `New Whistleblower Report: ${formData.reportType}`,
          message: `
            Report Type: ${formData.reportType}
            Department: ${formData.department}
            Description: ${formData.description}
            Anonymous: ${formData.isAnonymous ? 'Yes' : 'No'}
          `
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit report');
      }

      // Track successful submission using GA4 event
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'whistleblower_report', {
          report_type: formData.reportType,
          department: formData.department,
          is_anonymous: formData.isAnonymous,
          event_category: 'conversion',
          event_label: 'Whistleblower Report Submitted'
        });
      }

      setStatus('success');
      setMessage('Thank you for your report. We will review it promptly.');
      setFormData({
        reportType: '',
        department: '',
        description: '',
        isAnonymous: false
      });
    } catch (error) {
      console.error('Error submitting report:', error);
      setStatus('error');
      setMessage('Failed to submit report. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      <div>
        <label htmlFor="report-type" className="block text-sm font-medium text-gray-700 mb-2">
          Type of Report
        </label>
        <select
          id="report-type"
          value={formData.reportType}
          onChange={(e) => setFormData({ ...formData, reportType: e.target.value })}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        >
          <option value="">Select a category</option>
          <option value="waste">Government Waste</option>
          <option value="fraud">Fraud</option>
          <option value="abuse">Abuse of Power</option>
          <option value="corruption">Corruption</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
          Government Department/Agency
        </label>
        <input
          type="text"
          id="department"
          value={formData.department}
          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
          placeholder="Enter department or agency name"
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={6}
          placeholder="Provide detailed information about the issue..."
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label htmlFor="evidence" className="block text-sm font-medium text-gray-700 mb-2">
          Evidence (Optional)
        </label>
        <input
          type="file"
          id="evidence"
          multiple
          className="w-full"
        />
        <p className="mt-1 text-sm text-gray-500">
          You can upload documents, photos, or other evidence. Maximum file size: 10MB
        </p>
      </div>

      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            id="anonymous"
            type="checkbox"
            checked={formData.isAnonymous}
            onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>
        <div className="ml-3 text-sm">
          <label htmlFor="anonymous" className="font-medium text-gray-700">
            Submit Anonymously
          </label>
          <p className="text-gray-500">
            Your identity will be protected. We will never share your personal information.
          </p>
        </div>
      </div>

      <button
        type="submit"
        disabled={status === 'loading'}
        className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
      >
        {status === 'loading' ? 'Submitting...' : 'Submit Report'}
      </button>

      {message && (
        <p className={`mt-2 ${status === 'error' ? 'text-red-500' : 'text-green-500'}`}>
          {message}
        </p>
      )}
    </form>
  );
} 