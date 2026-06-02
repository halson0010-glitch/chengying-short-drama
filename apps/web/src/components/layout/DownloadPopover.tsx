import { useState } from 'react';
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

  const showPopover = () => {
    setOpen((visible) => {
      if (!visible) track('download_popover_open', { source: 'header' });
      return true;
    });
  };

  return (
    <div
      className="relative"
      onMouseEnter={showPopover}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        data-track="download-app"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() =>
          setOpen((visible) => {
            if (!visible) track('download_popover_open', { source: 'header' });
            return !visible;
          })
        }
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
