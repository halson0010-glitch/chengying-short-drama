export const eventLabels: Record<string, string> = {
  page_view: '页面浏览',
  scroll_depth: '页面滚动深度',
  section_reveal: '内容区块曝光',
  drama_card_click: '短剧卡片点击',
  hero_switch: '首页推荐切换',
  hero_auto_switch: '首页推荐自动切换',
  hero_manual_switch: '首页推荐手动切换',
  play_button_click: '播放按钮点击',
  play_start: '播放开始',
  play_pause: '播放暂停',
  play_complete: '播放完成',
  play_progress: '播放进度',
  play_rate_change: '倍速切换',
  episode_click: '剧集点击',
  autoplay_next_episode: '自动连播下一集',
  filter_change: '分类筛选',
  search_focus: '搜索框聚焦',
  search_input: '搜索输入',
  search_submit: '搜索提交',
  search_result_view: '搜索结果展示',
  search_suggestion_click: '搜索建议点击',
  search_result_click: '搜索结果点击',
  search_no_result: '搜索无结果',
  home_hero_dwell: '首页停留',
  favorite_toggle: '收藏切换',
  download_button_click: '下载按钮点击',
  download_popover_open: '下载弹窗打开',
  payment_checkout_start: '支付开始',
  payment_checkout_created: '支付订单创建',
  payment_checkout_redirect: '跳转支付页',
  payment_success_page_view: '支付成功页访问',
  payment_cancel_page_view: '支付取消页访问',
  payment_failed: '支付失败',
  payment_not_configured: '支付接口未配置',
  bottom_nav_click: '底部导航点击',
  home_module_view: '首页模块曝光',
  home_module_more_click: '首页模块更多点击',
  recommendation_refresh_click: '推荐换一批',
  continue_watch_module_view: '继续观看模块曝光',
  ranking_view: '排行榜曝光',
  ranking_tab_switch: '排行榜切换',
  ranking_item_click: '排行榜短剧点击',
  library_page_view: '追剧页访问',
  library_tab_switch: '追剧页 Tab 切换',
  continue_watch_click: '继续观看点击',
  favorite_item_click: '收藏短剧点击',
  history_item_click: '历史短剧点击',
  history_clear_click: '清空观看历史',
  detail_continue_watch_click: '详情继续观看点击',
  episode_group_switch: '剧集分组切换',
  episode_locked_click: '锁定剧集点击',
  episode_panel_open: '选集面板打开',
  episode_panel_close: '选集面板关闭',
  watch_progress_checkpoint: '播放进度检查点',
  watch_duration_update: '观看时长更新',
  next_episode_click: '下一集点击',
  previous_episode_click: '上一集点击',
  locked_episode_view: '锁定剧集曝光',
  trial_end_popup_view: '试看结束弹窗曝光',
  paywall_popup_view: '付费弹窗曝光',
  paywall_cta_click: '付费弹窗按钮点击',
  login_required_popup_view: '登录引导弹窗曝光',
  search_hot_keyword_click: '热门搜索词点击',
  search_recent_keyword_click: '历史搜索词点击',
  search_suggest_view: '搜索建议曝光',
  search_suggest_click: '搜索建议点击',
  account_module_click: '我的页模块点击',
  recharge_entry_click: '充值入口点击',
  payment_history_view: '支付记录查看',
  entitlement_view: '权益状态查看',
  share_click: '分享点击',
  share_success: '分享成功',
};

const payloadLabels: Record<string, string> = {
  keyword: '搜索词',
  source: '来源',
  dramaTitle: '短剧',
  activeDramaTitle: '短剧',
  dramaId: '短剧 ID',
  episode: '集数',
  fromEpisode: '上一集',
  toEpisode: '下一集',
  progress: '进度',
  depth: '深度',
  percent: '百分比',
  durationMs: '停留时长',
  rate: '倍速',
  filterKey: '筛选项',
  filterValue: '筛选值',
  module: '模块',
  position: '位置',
  resultCount: '结果数',
  suggestionCount: '建议数',
  recentCount: '历史词数',
  count: '数量',
  route: '路由',
  title: '页面标题',
  label: '名称',
  type: '类型',
  group: '分组',
  from: '切换前',
  to: '切换后',
  rank: '排名',
  score: '分数',
  checkpoint: '检查点',
  currentTime: '播放位置',
  duration: '总时长',
  mode: '弹窗类型',
  collected: '收藏状态',
  provider: '支付渠道',
  status: '状态',
  reason: '原因',
};

function text(value: unknown) {
  return value === undefined || value === null || value === '' ? '' : String(value);
}

function percent(value: unknown) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return '';
  return `${numericValue > 1 ? numericValue : Math.round(numericValue * 100)}%`;
}

function duration(value: unknown) {
  const milliseconds = Number(value);
  if (!Number.isFinite(milliseconds)) return '';
  if (milliseconds < 1000) return `${Math.round(milliseconds)}ms`;
  return `${Math.round(milliseconds / 1000)}s`;
}

function payloadPart(key: string, value: unknown) {
  if (value === undefined || value === null || value === '') return '';
  if (key === 'depth' || key === 'percent' || key === 'progress') return `${payloadLabels[key]}：${percent(value)}`;
  if (key === 'durationMs') return `${payloadLabels[key]}：${duration(value)}`;
  if (key === 'currentTime' || key === 'duration') return `${payloadLabels[key]}：${Math.round(Number(value) || 0)}s`;
  if (key === 'checkpoint') return `${payloadLabels[key]}：${percent(Number(value) > 1 ? Number(value) : value)}`;
  if (key === 'rate') return `${payloadLabels[key]}：${text(value)}x`;
  if (key === 'episode' || key === 'fromEpisode' || key === 'toEpisode') return `${payloadLabels[key]}：第 ${text(value)} 集`;
  return `${payloadLabels[key] ?? key}：${text(value).slice(0, 36)}`;
}

function partsFromPayload(payload: Record<string, unknown>, keys: string[]) {
  return keys.map((key) => payloadPart(key, payload[key])).filter(Boolean);
}

export function getEventLabel(event: string) {
  return eventLabels[event] || event;
}

export function summarizeEventPayload(event: string, payload: Record<string, unknown>) {
  if (event === 'scroll_depth') {
    return partsFromPayload(payload, ['depth', 'percent', 'route', 'source']).join(' · ') || '无关键 payload';
  }

  if (event === 'home_hero_dwell') {
    return partsFromPayload(payload, ['durationMs', 'activeDramaTitle', 'dramaTitle', 'source']).join(' · ') || '无关键 payload';
  }

  if (event.startsWith('search_')) {
    return partsFromPayload(payload, ['keyword', 'resultCount', 'source']).join(' · ') || '无关键 payload';
  }

  if (event === 'autoplay_next_episode') {
    return partsFromPayload(payload, ['dramaTitle', 'fromEpisode', 'toEpisode', 'source']).join(' · ') || '无关键 payload';
  }

  if (event.startsWith('ranking_')) {
    return partsFromPayload(payload, ['type', 'dramaTitle', 'rank', 'score', 'source']).join(' · ') || '无关键 payload';
  }

  if (event.startsWith('library_') || event.includes('history') || event.includes('favorite') || event.includes('continue_watch')) {
    return partsFromPayload(payload, ['dramaTitle', 'episode', 'progress', 'count', 'source']).join(' · ') || '无关键 payload';
  }

  if (event.includes('paywall') || event.includes('locked') || event.includes('login_required')) {
    return partsFromPayload(payload, ['dramaTitle', 'episode', 'mode', 'source']).join(' · ') || '无关键 payload';
  }

  if (event === 'watch_progress_checkpoint' || event === 'watch_duration_update') {
    return partsFromPayload(payload, ['dramaTitle', 'episode', 'checkpoint', 'progress', 'currentTime', 'durationMs']).join(' · ') || '无关键 payload';
  }

  if (event === 'bottom_nav_click' || event === 'account_module_click' || event.startsWith('home_module')) {
    return partsFromPayload(payload, ['label', 'module', 'route', 'source']).join(' · ') || '无关键 payload';
  }

  if (event.startsWith('share_')) {
    return partsFromPayload(payload, ['dramaTitle', 'source']).join(' · ') || '无关键 payload';
  }

  if (event.startsWith('play_') || event === 'episode_click') {
    return partsFromPayload(payload, ['dramaTitle', 'episode', 'rate', 'source']).join(' · ') || '无关键 payload';
  }

  const defaultKeys = [
    'keyword',
    'source',
    'dramaTitle',
    'episode',
    'progress',
    'durationMs',
    'rate',
    'filterKey',
    'filterValue',
    'module',
    'position',
  ];
  return partsFromPayload(payload, defaultKeys).slice(0, 4).join(' · ') || '无关键 payload';
}
