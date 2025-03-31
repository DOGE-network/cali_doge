import MailingList from '@/components/MailingList'

export default function JoinPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Join Our Mailing List
          </h1>
          <p className="text-xl text-gray-600">
            Get the latest updates and news delivered straight to your inbox.
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-8">
          <MailingList className="max-w-md mx-auto" />
        </div>
      </div>
    </div>
  )
} 