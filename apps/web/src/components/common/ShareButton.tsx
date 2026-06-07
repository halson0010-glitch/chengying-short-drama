import { useState } from 'react';
import { track } from '../../lib/analytics';
import type { Drama } from '../../types/drama';
import { ShareIcon } from './Icons';

type ShareButtonProps = {
  drama: Drama;
  url?: string;
  className?: string;
};

export default function ShareButton({ drama, url = window.location.href, className = '' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const copyShareLink = async () => {
    track('share_click', { dramaId: drama.id, dramaTitle: drama.title, source: 'detail-page' });
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      track('share_success', { dramaId: drama.id, dramaTitle: drama.title, source: 'clipboard' });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copyShareLink}
      className={`inline-flex h-11 items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.05] px-5 text-sm font-semibold text-white/72 transition hover:border-accent/40 hover:text-white ${className}`}
    >
      <ShareIcon className="h-4 w-4" />
      {copied ? '已复制' : '分享'}
    </button>
  );
}
