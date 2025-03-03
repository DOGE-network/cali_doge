import { ReactNode } from 'react';

export default function AgenciesLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <section>
      {children}
    </section>
  )
} 