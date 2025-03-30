'use client';

import Link from 'next/link';
import Image from 'next/image';
import { NavMenu } from './NavMenu';

export default function Header() {
  return (
    <header className="bg-odi-white border-b border-odi-gray-300 relative z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-6">
              <div className="w-20 h-20 relative flex-shrink-0">
                <Image
                  src="/icon2.svg"
                  alt="DOGE Logo"
                  width={80}
                  height={80}
                  className="object-contain"
                  priority
                  unoptimized
                />
              </div>
              <div className="relative pl-4">
                <div className="flex items-baseline">
                  <div className="absolute -left-4 -top-4">
                    <div className="w-20 h-20 relative -rotate-15">
                      <Image
                        src="/unofficial-stamp.svg"
                        alt="Unofficial Stamp"
                        width={80}
                        height={80}
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  </div>
                  <h1 className="text-2xl font-bold text-odi-black ml-16">California Department of Government Efficiency</h1>
                </div>
                <p className="text-sm text-odi-gray-600 mt-1 ml-16">
                    Possible future home of <span className="text-blue-600">https://doge.ca.gov/</span>
                  </p>
              </div>
            </Link>
          </div>
          <div className="flex items-center">
            <NavMenu />
          </div>
        </div>
      </div>
    </header>
  );
} 