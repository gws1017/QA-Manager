/** TC / 이슈 화면 공용 상수 (선택지 목록 + 뱃지 스타일) */

/* ── TC 결과 ── */
export const RESULTS = ['Pass', 'Fail', 'N/A', 'No Run'] as const;
export const RESULT_STYLE: Record<string, string> = {
  Pass:    'bg-green-100 text-green-800',
  Fail:    'bg-red-100 text-red-800 font-bold',
  'N/A':   'bg-yellow-100 text-yellow-800',
  'No Run':'bg-gray-100 text-gray-600',
};
export const ROW_STYLE: Record<string, string> = {
  Pass: 'bg-green-50', Fail: 'bg-red-50', 'N/A': 'bg-yellow-50', 'No Run': '',
};

/* ── 이슈 ── */
export const STATUSES   = ['Open', 'In Progress', 'Resolved', 'Closed'] as const;
export const TYPES      = ['Bug', 'Task', 'Improvement', 'Feature'] as const;
export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const;

export const STATUS_STYLE: Record<string, string> = {
  'Open':        'bg-gray-100 text-gray-600',
  'In Progress': 'bg-blue-100 text-blue-700',
  'Resolved':    'bg-green-100 text-green-700',
  'Closed':      'bg-gray-200 text-gray-500',
};
export const TYPE_STYLE: Record<string, string> = {
  Bug:         'bg-red-100 text-red-700',
  Task:        'bg-blue-100 text-blue-600',
  Improvement: 'bg-green-100 text-green-700',
  Feature:     'bg-purple-100 text-purple-700',
};
export const PRIORITY_COLOR: Record<string, string> = {
  Critical: 'text-red-500', High: 'text-orange-400', Medium: 'text-yellow-400', Low: 'text-blue-300',
};
