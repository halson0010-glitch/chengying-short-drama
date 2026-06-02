import type { FilterState } from '../../types/drama';
import FilterChips from './FilterChips';

export const initialFilters: FilterState = {
  background: '全部',
  theme: '全部',
  setting: '全部',
  audience: '全部',
  time: '全部',
  recommendation: '全部',
};

const rows: { key: keyof FilterState; label: string; options: string[] }[] = [
  {
    key: 'background',
    label: '背景',
    options: ['全部', '现代', '都市', '古代', '乡村', '年代', '架空', '职场', '民国', '宫廷', '校园'],
  },
  {
    key: 'theme',
    label: '主题',
    options: [
      '全部',
      '现言',
      '女性成长',
      '脑洞',
      '奇幻',
      '玄幻',
      '古言',
      '战神',
      '仙侠',
      '悬疑',
      '喜剧',
      '青春',
      '法律',
      '科幻',
    ],
  },
  {
    key: 'setting',
    label: '设定',
    options: [
      '全部',
      '打脸虐渣',
      '大男主',
      '大女主',
      '马甲',
      '重生',
      '穿越',
      '系统',
      '先婚后爱',
      '家长里短',
      '神豪',
      '豪门',
      '破镜重圆',
      '甜宠',
      '追妻',
      '姐弟恋',
      '一见钟情',
      '双向救赎',
    ],
  },
  { key: 'audience', label: '受众', options: ['全部', '男频', '女频'] },
  { key: 'time', label: '时间', options: ['全部', '7天内上新', '14天内上新', '30天内上新', '90天内上新'] },
  { key: 'recommendation', label: '推荐', options: ['全部', '最新', '最热'] },
];

type CategoryFiltersProps = {
  filters: FilterState;
  onChange: (key: keyof FilterState, value: string) => void;
};

export default function CategoryFilters({ filters, onChange }: CategoryFiltersProps) {
  return (
    <div className="surface mt-6 px-4 py-2 md:px-6">
      {rows.map((row) => (
        <FilterChips
          key={row.key}
          label={row.label}
          filterKey={row.key}
          options={row.options}
          value={filters[row.key]}
          onChange={(value) => onChange(row.key, value)}
        />
      ))}
    </div>
  );
}
