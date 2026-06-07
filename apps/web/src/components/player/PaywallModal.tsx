import { Link } from 'react-router-dom';
import { track } from '../../lib/analytics';
import type { Drama } from '../../types/drama';
import { CloseIcon, LockIcon } from '../common/Icons';

type PaywallModalProps = {
  open: boolean;
  mode: 'login' | 'paywall' | 'trial';
  drama: Drama;
  episode?: number;
  onClose: () => void;
};

const copy = {
  login: {
    title: '登录后继续观看',
    description: '该集需要登录后确认观看权益。',
    cta: '去登录',
    to: '/login',
  },
  paywall: {
    title: '本集需要解锁',
    description: '开通权益后可继续观看付费剧集。',
    cta: '去充值',
    to: '/account',
  },
  trial: {
    title: '试看已结束',
    description: '继续观看完整内容需要登录或开通权益。',
    cta: '查看权益',
    to: '/account',
  },
};

export default function PaywallModal({ open, mode, drama, episode, onClose }: PaywallModalProps) {
  if (!open) return null;
  const item = copy[mode];

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/65 px-4 pb-5 backdrop-blur-sm sm:items-center sm:pb-0">
      <div className="w-full max-w-md rounded-3xl border border-white/[0.1] bg-[#17171d] p-5 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/16 text-[#ff7555]">
              <LockIcon className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold">{item.title}</h2>
              <p className="mt-1 text-xs text-white/42">
                {drama.title}
                {episode ? ` · 第 ${episode} 集` : ''}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭" className="rounded-full p-2 text-white/45 hover:bg-white/10 hover:text-white">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-5 text-sm leading-6 text-white/58">{item.description}</p>
        <div className="mt-6 flex gap-3">
          <Link
            to={item.to}
            onClick={() =>
              track('paywall_cta_click', {
                dramaId: drama.id,
                dramaTitle: drama.title,
                episode,
                mode,
                source: 'paywall-modal',
              })
            }
            className="flex h-11 flex-1 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-white transition hover:brightness-110"
          >
            {item.cta}
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-white/[0.1] px-5 text-sm font-semibold text-white/62 hover:border-white/20 hover:text-white"
          >
            稍后
          </button>
        </div>
      </div>
    </div>
  );
}
