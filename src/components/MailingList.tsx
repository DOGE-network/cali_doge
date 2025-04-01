'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Script from 'next/script'

interface MailingListProps {
  className?: string
  onSuccess?: () => void
}

interface HCaptcha {
  render(_elementId: string, _config: { sitekey: string; callback(_response: string): void; 'expired-callback'(): void }): string;
  reset(_id: string): void;
}

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    hcaptcha: HCaptcha;
  }
}

export default function MailingList({ className = '', onSuccess }: MailingListProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [widgetId, setWidgetId] = useState('')
  const [showCaptcha, setShowCaptcha] = useState(false)

  const initializeCaptcha = useCallback(() => {
    if (typeof window !== 'undefined' && window.hcaptcha && showCaptcha) {
      const container = document.getElementById('hcaptcha-container')
      if (!container) return

      // Clear existing widget if any
      if (widgetId) {
        try {
          window.hcaptcha.reset(widgetId)
        } catch (e) {
          console.error('Error resetting hCaptcha:', e)
        }
      }

      const handleSubmitWithToken = async (_response: string) => {
        setStatus('loading')
        setMessage('')
    
        try {
          const { error } = await supabase
            .from('mailing_list')
            .insert([{ email, subscribed_at: new Date().toISOString() }])
    
          if (error) {
            // Check if the error is due to a unique constraint violation (email already exists)
            if (error.message?.includes('duplicate key value violates unique constraint')) {
              setStatus('success')
              setMessage('You are already subscribed to our mailing list!')
              setEmail('')
              setCaptchaToken('')
              setShowCaptcha(false)
              if (widgetId) {
                window.hcaptcha.reset(widgetId)
              }
              onSuccess?.()
              return
            }
            throw error
          }

          // Send welcome email
          try {
            await fetch('/api/send-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email,
                message: 'Welcome to California DOGE! You have successfully subscribed to our mailing list. We will keep you updated with the latest news and updates.',
                subject: 'Welcome to California DOGE Mailing List'
              }),
            })
          } catch (emailError) {
            console.error('Error sending welcome email:', emailError)
            // Don't throw the error - we still want to show success to the user
          }
    
          setStatus('success')
          setMessage('Thanks for subscribing!')
          setEmail('')
          setCaptchaToken('')
          setShowCaptcha(false)
          if (widgetId) {
            window.hcaptcha.reset(widgetId)
          }
          onSuccess?.()
        } catch (error) {
          setStatus('error')
          setMessage('Something went wrong. Please try again.')
        }
      }

      try {
        const id = window.hcaptcha.render('hcaptcha-container', {
          sitekey: process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY!,
          callback: (response: string) => {
            setCaptchaToken(response)
            handleSubmitWithToken(response)
          },
          'expired-callback': () => {
            setCaptchaToken('')
            window.hcaptcha.reset(id)
          }
        })
        setWidgetId(id)
      } catch (e) {
        console.error('Error rendering hCaptcha:', e)
      }
    }
  }, [widgetId, showCaptcha, email, onSuccess])

  useEffect(() => {
    initializeCaptcha()
  }, [initializeCaptcha])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!showCaptcha) {
      setShowCaptcha(true)
      return
    }

    if (!captchaToken) {
      setStatus('error')
      setMessage('Please complete the captcha verification')
      return
    }
  }

  return (
    <>
      <Script
        src="https://js.hcaptcha.com/1/api.js"
        async
        defer
        strategy="afterInteractive"
        onLoad={initializeCaptcha}
      />
      <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
          </button>
        </div>
        {showCaptcha && <div id="hcaptcha-container" className="flex justify-center" />}
        {message && (
          <p className={`text-sm ${status === 'error' ? 'text-red-500' : 'text-green-500'}`}>
            {message}
          </p>
        )}
      </form>
    </>
  )
} 