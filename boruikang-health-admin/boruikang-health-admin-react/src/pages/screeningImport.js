import { createImportTemplate, finishImportTable, importDate, mapImportTable, readImportFile, validateImportFields } from './fileImport.js'

export const screeningImportColumns = [
  { key: 'name', title: '姓名', required: true, max: 80 }, { key: 'gender', title: '性别' }, { key: 'age', title: '年龄' },
  { key: 'phone', title: '联系电话', required: true, max: 24, aliases: ['联系电话', '电话', '手机号'] },
  { key: 'screened_at', title: '发现时间', aliases: ['发现时间', '筛查时间'] },
  { key: 'finding', title: '发现结论', required: true, max: 1000, aliases: ['发现结论', '发现/检查结论', '检查结论'] },
  { key: 'category', title: '分类', max: 80 }, { key: 'external_id', title: '来源编号', max: 80 }, { key: 'id_card_tail', title: '证件尾号', max: 6 },
]
export function normalizeScreeningRows(records) {
  const table = mapImportTable(records, screeningImportColumns)
  for (const entry of table.entries) {
    entry.row = validateImportFields(entry, screeningImportColumns)
    entry.row.screened_at = importDate(entry.values.screened_at)
    if (entry.row.screened_at === null) entry.errors.push('发现时间无效，请填写 YYYY-MM-DD 或 YYYY-MM-DD HH:mm[:ss]')
  }
  return finishImportTable(table)
}
export async function parseScreeningFile(file) {
  const { records, sheetName } = await readImportFile(file)
  return { ...normalizeScreeningRows(records), sheetName }
}
export function createScreeningTemplate() {
  return createImportTemplate(screeningImportColumns, [
    ['姓名 / 联系电话 / 发现结论', '必填：姓名最多 80 字，电话 6–24 位数字/空格/加号/短横线，结论最多 1000 字。'],
    ['性别', '可空；男、女、未知或 MALE/FEMALE/UNKNOWN。'], ['年龄', '可空；0–130 的整数。'],
    ['发现时间', '可空（使用导入时间）；Excel 日期或 YYYY-MM-DD / YYYY-MM-DD HH:mm:ss 文本。'],
    ['分类 / 来源编号', '可空，各最多 80 字；同医院同来源的相同来源编号将跳过。'],
    ['证件尾号', '可空，最多 6 字；电话、来源编号、证件尾号按文本填写，保留前导零。'],
    ['来源 / 来源机构 / 所属活动 / 负责人', '在导入弹窗统一选择，不在文件中填写。'],
    ['虚构填写示例（不参与导入）', '演示对象 / 男 / 66 / 00000000001 / 2026-09-30 08:30 / 虚构筛查结论 / 筛查 / DEMO-001 / 001234'],
  ], '患者池')
}
