import { ButtonHTMLAttributes } from 'react';
import Link from 'next/link';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  variant?: 'primary' | 'secondary';
}

export default function Button({ href, variant = 'primary', children, ...props }: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center px-6 py-3 text-body-m font-medium rounded-md transition-colors duration-150';
  const variants = {
    primary: 'bg-odi-blue text-odi-white hover:bg-odi-dark-blue focus:ring-2 focus:ring-offset-2 focus:ring-odi-blue',
    secondary: 'bg-odi-white text-odi-blue border border-odi-blue hover:bg-odi-gray-100 focus:ring-2 focus:ring-offset-2 focus:ring-odi-blue',
  };

  if (href) {
    return (
      <Link href={href} className={`${baseStyles} ${variants[variant]}`}>
        {children}
      </Link>
    );
  }

  return (
    <button {...props} className={`${baseStyles} ${variants[variant]}`}>
      {children}
    </button>
  );
} 