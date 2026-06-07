import { useEffect, useRef, useState } from 'react';
import { track } from '../../lib/analytics';

const qrCells = [
  '11111000111',
  '10001010101',
  '10101000101',
  '10001011101',
  '11111000111',
  '00100110010',
  '11010101100',
  '00111011011',
  '11111010101',
  '10001001010',
  '11111011101',
];

export default function DownloadPopover() {
  const [open, setOpen] = useState(false);
  const [openTrigger, setOpenTrigger] = useState<'click' | 'hover' | ''>('');
  const hoverTimerRef = useRef<number>();
  const reportedOpenRef = useRef(false);

  useEffect(() => {
    if (open && openTrigger && !reportedOpenRef.current) {
      reportedOpenRef.current = true;
      track('download_popover_open', { source: 'header', trigger: openTrigger });
    }
  }, [open, openTrigger]);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const openPopover = (trigger: 'click' | 'hover') => {
    setOpenTrigger(trigger);
    setOpen(true);
  };

  const closePopover = () => {
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = undefined;
    reportedOpenRef.current = false;
    setOpen(false);
    setOpenTrigger('');
  };

  const scheduleHoverOpen = () => {
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = window.setTimeout(() => {
      openPopover('hover');
      hoverTimerRef.current = undefined;
    }, 300);
  };

  return (
    <div
      className="relative"
      onMouseEnter={scheduleHoverOpen}
      onMouseLeave={closePopover}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
          hoverTimerRef.current = undefined;
          track('download_button_click', { source: 'header' });
          setOpen((visible) => {
            if (visible) {
              reportedOpenRef.current = false;
              setOpenTrigger('');
              return false;
            }
            setOpenTrigger('click');
            return true;
          });
        }}
        className="h-10 whitespace-nowrap rounded-full border border-accent/40 bg-accent/10 px-4 text-sm font-medium text-[#ff7655] transition hover:bg-accent hover:text-white"
      >
        下载APP
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="下载橙影短剧 App"
          className="absolute right-0 top-[calc(100%+12px)] z-50 w-64 animate-fade-up rounded-2xl border border-white/10 bg-[#17171d] p-4 shadow-card"
        >
          <div className="mx-auto mb-4 grid w-fit grid-cols-11 gap-[2px] rounded-lg bg-white p-2">
            {qrCells.flatMap((row, rowIndex) =>
              [...row].map((cell, cellIndex) => (
                <span
                  key={`${rowIndex}-${cellIndex}`}
                  className={`h-2 w-2 ${cell === '1' ? 'bg-[#121217]' : 'bg-white'}`}
                />
              )),
            )}
          </div>
          <p className="text-center text-sm font-semibold">扫码下载安装「橙影短剧App」</p>
          <p className="mt-2 text-center text-xs text-white/50">海量短剧免费看全集</p>
        </div>
      )}
    </div>
  );
}
