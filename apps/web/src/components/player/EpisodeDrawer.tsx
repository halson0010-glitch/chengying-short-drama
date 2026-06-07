import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { track } from '../../lib/analytics';
import type { Drama, DramaEpisode } from '../../types/drama';
import { CloseIcon, LockIcon } from '../common/Icons';

type EpisodeDrawerProps = {
  open: boolean;
  drama: Drama;
  episodes: DramaEpisode[];
  currentEpisode: number;
  isEpisodeLocked: (episode: DramaEpisode) => boolean;
  onClose: () => void;
  onLockedEpisode: (episode: DramaEpisode) => void;
};

function makeGroups(episodes: DramaEpisode[], size = 30) {
  const groups: DramaEpisode[][] = [];
  for (let index = 0; index < episodes.length; index += size) groups.push(episodes.slice(index, index + size));
  return groups;
}

export default function EpisodeDrawer({
  open,
  drama,
  episodes,
  currentEpisode,
  isEpisodeLocked,
  onClose,
  onLockedEpisode,
}: EpisodeDrawerProps) {
  const groups = useMemo(() => makeGroups(episodes), [episodes]);
  const currentGroupIndex = Math.max(
    0,
    groups.findIndex((group) => group.some((item) => item.episode === currentEpisode)),
  );
  const [activeGroup, setActiveGroup] = useState(currentGroupIndex);

  useEffect(() => {
    if (open) setActiveGroup(currentGroupIndex);
  }, [currentGroupIndex, open]);

  if (!open) return null;
  const activeEpisodes = groups[activeGroup] ?? [];

  return (
    <div className="fixed inset-0 z-[65] flex items-end bg-black/60 backdrop-blur-sm lg:hidden">
      <div className="max-h-[78vh] w-full overflow-hidden rounded-t-3xl border border-white/[0.1] bg-[#141419] shadow-card">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div>
            <h2 className="font-bold">选集</h2>
            <p className="mt-1 text-xs text-white/42">{drama.title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭选集" className="rounded-full p-2 text-white/45 hover:bg-white/10 hover:text-white">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="rail-scroll flex gap-2 overflow-x-auto px-5 py-3">
          {groups.map((group, index) => {
            const first = group[0]?.episode ?? 1;
            const last = group[group.length - 1]?.episode ?? first;
            return (
              <button
                key={`${first}-${last}`}
                type="button"
                onClick={() => {
                  setActiveGroup(index);
                  track('episode_group_switch', {
                    dramaId: drama.id,
                    dramaTitle: drama.title,
                    group: `${first}-${last}`,
                    source: 'watch-episode-drawer',
                  });
                }}
                className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${
                  activeGroup === index ? 'bg-accent text-white' : 'bg-white/[0.06] text-white/58 hover:text-white'
                }`}
              >
                {first}-{last}
              </button>
            );
          })}
        </div>
        <div className="grid max-h-[48vh] grid-cols-5 gap-2 overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-2">
          {activeEpisodes.map((item) => {
            const locked = isEpisodeLocked(item);
            const className = `relative flex h-12 items-center justify-center rounded-xl border text-sm transition ${
              item.episode === currentEpisode
                ? 'border-accent bg-accent text-white'
                : locked
                  ? 'border-white/[0.06] bg-white/[0.025] text-white/35'
                  : 'border-white/[0.08] bg-white/[0.04] text-white/62 hover:border-accent/40 hover:text-white'
            }`;
            if (locked) {
              return (
                <button key={item.episode} type="button" onClick={() => onLockedEpisode(item)} className={className}>
                  {item.episode}
                  <LockIcon className="absolute right-1.5 top-1.5 h-3 w-3" />
                  <span className="absolute bottom-1 right-1.5 text-[9px] text-white/35">付</span>
                </button>
              );
            }
            return (
              <Link
                key={item.episode}
                to={`/watch/${drama.id}/${item.episode}`}
                onClick={() => {
                  track('episode_click', { dramaId: drama.id, dramaTitle: drama.title, episode: item.episode, source: 'watch-drawer' });
                  onClose();
                }}
                className={className}
              >
                {item.episode}
                <span className={`absolute bottom-1 right-1.5 text-[9px] ${item.isFree === false ? 'text-[#ffb199]' : 'text-white/35'}`}>
                  {item.isFree === false ? '付' : '免'}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
