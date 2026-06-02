import type { PropsWithChildren } from 'react';

type PageContainerProps = PropsWithChildren<{
  className?: string;
}>;

export default function PageContainer({ className = '', children }: PageContainerProps) {
  return <div className={`mx-auto w-full max-w-7xl px-4 md:px-8 ${className}`}>{children}</div>;
}

