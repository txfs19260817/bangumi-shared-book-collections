/**
 * Storage utility module that replaces GM_getValue and GM_setValue with localStorage
 * All data is stored under a single namespace to avoid conflicts
 */

const STORAGE_PREFIX = 'bangumi_shared_book_';

/**
 * Gets a value from localStorage
 * @param key - The key to retrieve
 * @param defaultValue - The default value to return if key doesn't exist
 * @returns The stored value or defaultValue
 */
export function getValue(key: string, defaultValue?: any): any {
  try {
    const fullKey = STORAGE_PREFIX + key;
    const stored = localStorage.getItem(fullKey);

    if (stored === null) {
      return defaultValue;
    }

    // Try to parse as JSON, fallback to raw string if parsing fails
    try {
      return JSON.parse(stored);
    } catch {
      return stored;
    }
  } catch (error) {
    console.error(`Error reading from localStorage for key ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Sets a value in localStorage
 * @param key - The key to store under
 * @param value - The value to store
 */
export function setValue(key: string, value: any): void {
  try {
    const fullKey = STORAGE_PREFIX + key;

    // Convert value to JSON string for consistent storage
    const valueToStore = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(fullKey, valueToStore);
  } catch (error) {
    console.error(`Error writing to localStorage for key ${key}:`, error);
  }
}

/**
 * Removes a value from localStorage
 * @param key - The key to remove
 */
export function removeValue(key: string): void {
  try {
    const fullKey = STORAGE_PREFIX + key;
    localStorage.removeItem(fullKey);
  } catch (error) {
    console.error(`Error removing from localStorage for key ${key}:`, error);
  }
}

/**
 * Clears all values with our storage prefix
 */
export function clearAllValues(): void {
  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing localStorage:', error);
  }
}

const parseTimestamp = (s: string) => {
  if (!s.includes("ago")) {
    return new Date(s);
  }
  const now = new Date();
  const d = s.match(/(\d+)d/i)?.[1] || "0";
  const h = s.match(/(\d+)h/i)?.[1] || "0";
  const m = s.match(/(\d+)m/i)?.[1] || "0";
  now.setDate(now.getDate() - (+d));
  now.setHours(now.getHours() - (+h));
  now.setMinutes(now.getMinutes() - (+m));
  return now;
}

const fetchHTMLDocument = (url: RequestInfo | URL, fetchMethod = "GET") => {
  return fetch(url, { method: fetchMethod, credentials: "include" }).then(
    (r) => r.text(),
    (err) => Promise.reject(err)
  ).then((t) => {
    const parser = new DOMParser();
    return parser.parseFromString(t, "text/html");
  });
};

function htmlToElement<T extends HTMLElement>(html: string): T {
  const template = document.createElement('template');
  html = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = html;
  return template.content.firstChild as T;
}

// Internationalization support
interface Translations {
  [key: string]: {
    zh: string;
    en: string;
    ja: string;
  };
}

const translations: Translations = {
  // Dialog strings
  'settings_title': {
    zh: '共读设置',
    en: 'Shared Book Collection Settings',
    ja: '共有読書リスト設定'
  },
  'settings_subtitle': {
    zh: '提交后请刷新以应用更改',
    en: 'Please refresh to apply changes',
    ja: '変更を適用するには、ページを更新してください'
  },
  'max_pages_label': {
    zh: '扫描最近读过条目的页数：',
    en: 'Number of pages to scan for recently read items:',
    ja: '最近読んだアイテムをスキャンするページ数：'
  },
  'max_results_label': {
    zh: '最多显示评论数：',
    en: 'Maximum number of comments to display:',
    ja: '表示するコメントの最大数：'
  },
  'show_stars_label': {
    zh: '显示评分：',
    en: 'Show ratings:',
    ja: '評価を表示：'
  },
  'disable_settings_label': {
    zh: '在首页隐藏设置按钮：',
    en: 'Hide settings button on the homepage:',
    ja: 'ホームページで設定ボタンを非表示にする：'
  },
  'disable_settings_help': {
    zh: '（隐藏首页的设置按钮。之后你仍可以在油猴扩展菜单中进行设置。）',
    en: '(Hides the settings button on the homepage. You can still access settings from the Tampermonkey extension menu.)',
    ja: '（ホームページの設定ボタンを非表示にします。設定はTampermonkey拡張機能メニューから引き続きアクセスできます。）'
  },
  'watchlist_label': {
    zh: '关注列表（每行一个条目ID，列表内条目的最新评论总会被获取）：',
    en: 'Watchlist (one item ID per line; the latest comments for items in this list will always be fetched):',
    ja: 'ウォッチリスト（1行に1アイテムID。このリスト内のアイテムの最新コメントは常に取得されます）：'
  },
  'watchlist_placeholder': {
    zh: '例如:\n326125\n329803',
    en: 'Example:\n326125\n329803',
    ja: '例：\n326125\n329803'
  },
  'submit_button': {
    zh: '提交',
    en: 'Submit',
    ja: '送信'
  },
  'reset_button': {
    zh: '重置',
    en: 'Reset',
    ja: 'リセット'
  },
  'close_button': {
    zh: '关闭',
    en: 'Close',
    ja: '閉じる'
  },
  'settings_menu': {
    zh: '设置',
    en: 'Settings',
    ja: '設定'
  },
  // TabItem strings
  'shared_reading': {
    zh: '共读',
    en: 'Shared Reading',
    ja: '共読'
  },
  'settings_gear': {
    zh: '⚙️设置',
    en: '⚙️Settings',
    ja: '⚙️設定'
  },
  // CommentParser strings
  'read_past_tense': {
    zh: ' 读过 ',
    en: ' read ',
    ja: ' が読みました '
  },
  // Language selection
  'language_label': {
    zh: '语言：',
    en: 'Language:',
    ja: '言語：'
  },
  'language_auto': {
    zh: '自动检测',
    en: 'Auto-detect',
    ja: '自動検出'
  },
  'language_zh': {
    zh: '中文',
    en: 'Chinese',
    ja: '中国語'
  },
  'language_en': {
    zh: '英文',
    en: 'English',
    ja: '英語'
  },
  'language_ja': {
    zh: '日文',
    en: 'Japanese',
    ja: '日本語'
  }
};

// Language detection and getter
function getLanguage(): 'zh' | 'en' | 'ja' {
  const stored = getValue('language');
  if (stored && ['zh', 'en', 'ja'].includes(stored)) {
    return stored as 'zh' | 'en' | 'ja';
  }

  // Auto-detect from browser language
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('zh')) return 'zh';
  if (browserLang.startsWith('ja')) return 'ja';
  return 'en'; // Default to English
}

function t(key: string): string {
  const lang = getLanguage();
  return translations[key]?.[lang] || translations[key]?.['en'] || key;
}

export { parseTimestamp, fetchHTMLDocument, htmlToElement, t, getLanguage }