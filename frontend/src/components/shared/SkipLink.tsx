'use client';

interface SkipLinkProps {
  href: string;
  label: string;
  position?: 'left' | 'nav';
}

export default function SkipLink({ href, label, position = 'left' }: SkipLinkProps) {
  const leftPos = position === 'nav' ? 'left-60' : 'left-2';

  return (
    <a
      href={href}
      className={`sr-only focus:not-sr-only focus:absolute focus:top-2 ${leftPos} focus:z-[9999] focus:px-4 focus:py-2 focus:bg-cyan-500 focus:text-slate-950 focus:rounded-lg focus:text-xs focus:font-bold`}
    >
      {label}
    </a>
  );
}