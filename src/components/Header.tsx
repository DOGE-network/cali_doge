import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-odi-white border-b border-odi-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-odi-black">California Department of Government Efficiency</h1>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
} 