export const screeningSections = [
  ['statistics', '筛查统计'], ['critical', '危急预警'], ['network', '一张网检出'],
  ['exam', '体检检出'], ['health', '健康筛查'], ['high-risk', '高危患者'], ['invitations', '邀约记录'],
]
export const screeningScopes = {
  critical: { ecg_grade: 'CRITICAL' }, network: { source_type: 'ECG_NETWORK' },
  exam: { source_type: 'EXAM' }, health: { source_type: 'HEALTH_SCREENING' }, 'high-risk': { high_risk: true },
}
export function csvCell(value) {
  const text = String(value ?? '')
  return '"' + (/^[=+@\-\t\r]/.test(text) ? "'" + text : text).replaceAll('"', '""') + '"'
}
export function downloadScreeningCsv(rows, title) {
  const fields = ['name', 'gender', 'age', 'phone', 'id_card_tail', 'source_type', 'screened_at', 'finding', 'category', 'risk_level', 'ecg_grade', 'ecg_scope', 'ecg_evidence', 'pool_status', 'risk_evidence']
  const headings = ['姓名', '性别', '年龄', '手机号', '证件尾号', '来源', '检出时间', '检查结论', '分类', '患者风险', '本次心电分级', '适用范围', '报告分级依据', '处理状态', '院方依据']
  const csv = '\ufeff' + [headings, ...rows.map(row => fields.map(key => row[key]))].map(row => row.map(csvCell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = title + '.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
