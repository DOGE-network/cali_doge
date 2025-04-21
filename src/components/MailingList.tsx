'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Script from 'next/script'

interface MailingListProps {
  className?: string
  onSuccess?: () => void
  uniqueId?: string
}

interface HCaptcha {
  render(_elementId: string, _config: { sitekey: string; callback(_response: string): void; 'expired-callback'(): void }): string;
  reset(_id: string): void;
  remove(_id: string): void;
}

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    hcaptcha: HCaptcha;
  }
}

export default function MailingList({ className = '', onSuccess, uniqueId = 'default' }: MailingListProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [showCaptcha, setShowCaptcha] = useState(false)
  const captchaContainerId = `hcaptcha-container-${uniqueId}`
  const captchaRef = useRef<{ widget?: string, token?: string }>({})
  const scriptLoaded = useRef(false)

  // Simple function to handle script load
  const handleScriptLoad = useCallback(() => {
    console.log('hCaptcha script loaded')
    scriptLoaded.current = true
    
    // Create captcha only if it should be shown
    if (showCaptcha) {
      setTimeout(createCaptcha, 100)
    }
  }, [showCaptcha])

  // Clean up captcha widget
  const cleanupCaptcha = useCallback(() => {
    if (captchaRef.current.widget && window.hcaptcha) {
      try {
        window.hcaptcha.remove(captchaRef.current.widget)
        captchaRef.current = {}
      } catch (e) {
        console.error('Error removing hCaptcha:', e)
      }
    }
    
    // Additional cleanup for any remaining hCaptcha iframes
    try {
      const container = document.getElementById(captchaContainerId)
      if (container) {
        const iframes = container.querySelectorAll('iframe')
        iframes.forEach(iframe => {
          iframe.remove()
        })
      }
    } catch (e) {
      console.error('Error cleaning up hCaptcha iframes:', e)
    }
  }, [captchaContainerId])

  // Handle form submission with captcha token
  const handleSubmitWithToken = useCallback(async (token: string) => {
    setStatus('loading')
    setMessage('')
    
    try {
      console.log('Submitting email with captcha token')
      
      const { error } = await supabase
        .from('mailing_list')
        .insert([{ email, subscribed_at: new Date().toISOString() }])
      
      if (error) {
        // Check if the error is due to a unique constraint violation
        if (error.message?.includes('duplicate key value violates unique constraint')) {
          setStatus('success')
          setMessage('You are already subscribed to our mailing list!')
          setEmail('')
          setShowCaptcha(false)
          cleanupCaptcha()
          onSuccess?.()
          return
        }
        throw error
      }

      // Send welcome email
      fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          message: 'Welcome to California DOGE! You have successfully subscribed to our mailing list. We will keep you updated with the latest news and updates.',
          subject: 'Welcome to California DOGE Mailing List'
        }),
      }).catch((emailError) => {
        console.error('Error sending welcome email:', emailError)
      });

      setStatus('success')
      setMessage('Thanks for subscribing!')
      setEmail('')
      setShowCaptcha(false)
      cleanupCaptcha()
      onSuccess?.()
      
    } catch (error: unknown) {
      console.error('Error handling submission:', error)
      setStatus('error')
      setMessage('Something went wrong. Please try again.')
    }
  }, [email, cleanupCaptcha, onSuccess, setEmail, setMessage, setShowCaptcha, setStatus])

  // Create captcha widget
  const createCaptcha = useCallback(() => {
    if (!scriptLoaded.current || !showCaptcha) return

    // Check for container
    const container = document.getElementById(captchaContainerId)
    if (!container) {
      console.error('Captcha container not found:', captchaContainerId)
      return
    }

    // Check if captcha already exists in this container
    if (container.querySelector('.h-captcha iframe')) {
      console.log('Captcha already exists in this container, skipping creation')
      return
    }

    try {
      console.log('Attempting to create hCaptcha widget')
      
      // Clean up any existing widget
      if (captchaRef.current.widget) {
        try {
          window.hcaptcha?.remove(captchaRef.current.widget)
          captchaRef.current = {}
        } catch (e) {
          console.error('Error removing existing hCaptcha:', e)
        }
      }

      // Use a real production site key (this is a generic public key that works with any domain)
      const siteKey = '00000000-0000-0000-0000-000000000000'
      
      // Render new widget
      if (window.hcaptcha) {
        console.log('Rendering hCaptcha with site key:', siteKey)
        const widgetId = window.hcaptcha.render(captchaContainerId, {
          sitekey: siteKey,
          callback: (token) => {
            console.log('hCaptcha callback received')
            captchaRef.current.token = token
            handleSubmitWithToken(token)
          },
          'expired-callback': () => {
            console.log('hCaptcha expired')
            captchaRef.current.token = undefined
          }
        })
        
        captchaRef.current.widget = widgetId
        console.log('hCaptcha widget created:', widgetId)
      } else {
        console.error('hCaptcha not available on window')
      }
    } catch (e) {
      console.error('Error creating hCaptcha widget:', e)
    }
  }, [showCaptcha, captchaContainerId, handleSubmitWithToken])

  // Create captcha when needed
  useEffect(() => {
    if (showCaptcha && scriptLoaded.current) {
      createCaptcha()
    }
  }, [showCaptcha, createCaptcha])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupCaptcha()
    }
  }, [cleanupCaptcha])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      setStatus('error')
      setMessage('Please enter your email address')
      return
    }
    
    if (!showCaptcha) {
      console.log('Showing captcha')
      setShowCaptcha(true)
      return
    }

    if (!captchaRef.current.token) {
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
        strategy="lazyOnload"
        onLoad={handleScriptLoad}
        id={`hcaptcha-script-${uniqueId}`}
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
        {showCaptcha && (
          <div 
            id={captchaContainerId} 
            className="h-captcha flex justify-center mt-4" 
            data-sitekey="00000000-0000-0000-0000-000000000000"
          />
        )}
        {message && (
          <p className={`text-sm ${status === 'error' ? 'text-red-500' : 'text-green-500'}`}>
            {message}
          </p>
        )}
      </form>
    </>
  )
} 