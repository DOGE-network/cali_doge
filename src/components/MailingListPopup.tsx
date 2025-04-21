'use client'

import { useState, useEffect } from 'react'
import MailingList from './MailingList'
import { usePathname } from 'next/navigation'

export default function MailingListPopup() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Don't show popup on the Join page
  if (pathname === '/join') {
    return null
  }

  useEffect(() => {
    // Check if user has already subscribed
    const hasSubscribed = localStorage.getItem('newsletter_subscribed')
    if (!hasSubscribed) {
      // Show popup after 3 seconds
      const timer = setTimeout(() => setIsOpen(true), 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleSuccess = () => {
    localStorage.setItem('newsletter_subscribed', 'true')
    setIsOpen(false)
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
      </div>
    </div>
  )
} 