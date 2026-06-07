import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { Drama } from '../../types/drama';
import { sanitizeSearchKeyword, track } from '../../lib/analytics';
import { clearRecentSearches, getRecentSearches, saveRecentSearch } from '../../lib/search';
import { searchDramasRemote } from '../../services/dramaApi';
import { CloseIcon, SearchIcon } from '../common/Icons';
import SearchSuggestPanel from './SearchSuggestPanel';

type SearchBoxProps = {
  variant?: 'header' | 'mobile' | 'page';
  autoFocus?: boolean;
  onClose?: () => void;
  className?: string;
};

export default function SearchBox({
  variant = 'header',
  autoFocus = false,
  onClose,
  className = '',
}: SearchBoxProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputChangedRef = useRef(false);
  const routeKeyword = location.pathname === '/search' ? new URLSearchParams(location.search).get('q') ?? '' : '';
  const [value, setValue] = useState(sanitizeSearchKeyword(routeKeyword));
  const [debouncedValue, setDebouncedValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Drama[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches());
  const [suggestViewKey, setSuggestViewKey] = useState('');

  useEffect(() => {
    if (location.pathname === '/search') {
      inputChangedRef.current = false;
      setValue(sanitizeSearchKeyword(routeKeyword));
      setRecentSearches(getRecentSearches());
    }
  }, [location.pathname, routeKeyword]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setFocused(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const sanitized = sanitizeSearchKeyword(value);
      setDebouncedValue(sanitized);
      if (sanitized && inputChangedRef.current) {
        track('search_input', { keyword: sanitized, source: variant });
        inputChangedRef.current = false;
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [value, variant]);

  useEffect(() => {
    let active = true;
    if (!debouncedValue) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return undefined;
    }

    setSuggestionsLoading(true);
    void searchDramasRemote(debouncedValue)
      .then((matches) => {
        if (active) setSuggestions(matches.slice(0, 6));
      })
      .catch(() => {
        if (active) setSuggestions([]);
      })
      .finally(() => {
        if (active) setSuggestionsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedValue]);

  useEffect(() => {
    if (!focused) return;
    const key = `${variant}|${debouncedValue || 'empty'}|${suggestions.length}|${recentSearches.length}`;
    if (key === suggestViewKey) return;
    setSuggestViewKey(key);
    track('search_suggest_view', {
      keyword: debouncedValue,
      suggestionCount: suggestions.length,
      recentCount: recentSearches.length,
      source: variant,
    });
  }, [debouncedValue, focused, recentSearches.length, suggestions.length, suggestViewKey, variant]);

  const submitSearch = (keyword: string = value, source: string = variant) => {
    const sanitized = sanitizeSearchKeyword(keyword);
    if (sanitized) setRecentSearches(saveRecentSearch(sanitized));
    track('search_submit', { keyword: sanitized, source });
    navigate(sanitized ? `/search?q=${encodeURIComponent(sanitized)}` : '/search');
    setFocused(false);
    onClose?.();
  };

  const selectSuggestion = (drama: Drama, position: number) => {
    track('search_suggestion_click', {
      keyword: debouncedValue,
      dramaId: drama.id,
      dramaTitle: drama.title,
      position,
    });
    track('search_suggest_click', {
      keyword: debouncedValue,
      dramaId: drama.id,
      dramaTitle: drama.title,
      position,
      source: variant,
    });
    navigate(`/detail/${drama.id}`);
    setFocused(false);
    onClose?.();
  };

  const wide = variant === 'page' ? 'w-full max-w-xl' : variant === 'mobile' ? 'w-full' : 'w-52 lg:w-72';

  return (
    <div ref={rootRef} className={`relative ${wide} ${className}`}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitSearch();
        }}
        className={`flex h-11 items-center rounded-full border bg-white/[0.06] px-3 transition ${
          focused ? 'border-accent' : 'border-white/[0.08]'
        }`}
      >
        <SearchIcon className="h-[18px] w-[18px] shrink-0 text-white/42" />
        <input
          value={value}
          autoFocus={autoFocus}
          data-track="search-input"
          aria-label="搜索短剧、演员、题材"
          placeholder="搜索短剧、演员、题材"
          onFocus={() => {
            setFocused(true);
            setRecentSearches(getRecentSearches());
            track('search_focus', { source: variant });
          }}
          onChange={(event) => {
            inputChangedRef.current = true;
            setValue(event.target.value);
            setFocused(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submitSearch();
            }
          }}
          className="min-w-0 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-white/36"
        />
        {value && variant === 'mobile' && (
          <button
            type="button"
            onClick={() => setValue('')}
            aria-label="清除搜索内容"
            className="mr-1 text-white/42 hover:text-white"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        )}
        <button type="submit" aria-label="搜索" className="text-sm font-medium text-[#ff7555] transition hover:text-accent">
          搜索
        </button>
      </form>
      {focused && (
        <SearchSuggestPanel
          keyword={debouncedValue}
          suggestions={suggestions}
          recentSearches={recentSearches}
          loading={suggestionsLoading}
          onSelect={selectSuggestion}
          onHotSelect={(keyword) => submitSearch(keyword, `${variant}-hot`)}
          onRecentSelect={(keyword) => {
            track('search_recent_keyword_click', { keyword, source: `${variant}-suggest-panel` });
            submitSearch(keyword, `${variant}-recent`);
          }}
          onClearRecent={() => {
            clearRecentSearches();
            setRecentSearches([]);
          }}
        />
      )}
    </div>
  );
}
