'use client'

import { useState, useEffect } from 'react'
import MailingList from './MailingList'
import { usePathname } from 'next/navigation'

export default function MailingListPopup() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  
  useEffect(() => {
    // Don't show popup on the Join page
    if (pathname === '/join') {
      return;
    }
    
    // Check if user has already subscribed or declined
    const hasSubscribed = localStorage.getItem('newsletter_subscribed')
    const hasDeclined = localStorage.getItem('newsletter_declined')
    if (!hasSubscribed && !hasDeclined) {
      // Show popup after 3 seconds
      const timer = setTimeout(() => setIsOpen(true), 3000)
      return () => clearTimeout(timer)
    }
  }, [pathname])

  const handleSuccess = () => {
    // Set the localStorage flag immediately
    localStorage.setItem('newsletter_subscribed', 'true')
    
    // Add a 5-second delay before closing the popup
    setTimeout(() => {
      setIsOpen(false)
    }, 5000)
  }

  const handleDecline = () => {
    // Store the user's preference
    localStorage.setItem('newsletter_declined', 'true')
    setIsOpen(false)
  }

  // Don't render the component at all when on the Join page
  if (pathname === '/join') {
    return null
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold">Subscribe to Our Mailing List</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <p className="text-gray-600 mb-4">
          Stay updated with our latest news and updates!
        </p>
        <MailingList onSuccess={handleSuccess} uniqueId="popup" />
        <div className="mt-4 text-center">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-200 border border-gray-300 hover:border-gray-400"
          >
            I don&apos;t wish to subscribe at this time
          </button>
        </div>
      </div>
    </div>
  )
} 