import { createImportTemplate, finishImportTable, importDate, mapImportTable, readImportFile, validateImportFields } from './fileImport.js'

export const patientImportColumns = [
  { key: 'name', title: '姓名', required: true, max: 80 }, { key: 'gender', title: '性别' }, { key: 'age', title: '年龄', required: true },
  { key: 'phone', title: '联系电话', required: true, max: 24, aliases: ['联系电话', '电话', '手机号'] },
  { key: 'department', title: '科室', required: true, max: 80 },
  { key: 'disease', title: '病种/管理原因', required: true, max: 120, aliases: ['病种/管理原因', '病种', '管理原因'] },
  { key: 'external_id', title: '来源编号', max: 80 }, { key: 'id_card', title: '证件号', max: 18, aliases: ['证件号', '身份证号'] },
  { key: 'birth_date', title: '出生日期' }, { key: 'address', title: '住址', max: 200, aliases: ['住址', '地址'] },
  { key: 'emergency_contact', title: '紧急联系人', max: 80 }, { key: 'emergency_phone', title: '紧急联系电话', max: 24 },
  { key: 'inpatient_no', title: '住院号', max: 60 }, { key: 'bed_no', title: '床号', max: 20 },
  { key: 'note', title: '内部备注', max: 2000, aliases: ['内部备注', '备注'] },
]
export function normalizePatientRows(records) {
  const table = mapImportTable(records, patientImportColumns)
  for (const entry of table.entries) {
    entry.row = validateImportFields(entry, patientImportColumns)
    entry.row.id_card = entry.values.id_card?.toUpperCase()
    if (entry.row.id_card && !/^[0-9X]{15,18}$/.test(entry.row.id_card)) entry.errors.push('证件号须为 15–18 位数字或 X')
    entry.row.birth_date = importDate(entry.values.birth_date, true)
    if (entry.row.birth_date === null) entry.errors.push('出生日期无效，请填写 YYYY-MM-DD')
  }
  return finishImportTable(table)
}
export async function parsePatientFile(file) {
  const { records, sheetName } = await readImportFile(file)
  return { ...normalizePatientRows(records), sheetName }
}
export function createPatientTemplate() {
  return createImportTemplate(patientImportColumns, [
    ['姓名 / 年龄 / 联系电话 / 科室 / 病种或管理原因', '必填；年龄为 0–130 整数。姓名和科室最多 80 字，病种/管理原因最多 120 字。'],
    ['性别', '可空，男、女、未知或 MALE/FEMALE/UNKNOWN。'],
    ['电话 / 编号 / 证件号 / 住院号 / 床号', '按文本填写以保留前导零；电话为 6–24 位数字/空格/加号/短横线。'],
    ['来源编号 / 证件号', '建议填写：同医院的文件来源编号或证件号重复则跳过，不覆盖档案。不按手机号合并。'],
    ['没有来源编号或证件号', '仅同次提交重试防重，跨批次重复导入可能重复建档。'],
    ['证件号 / 出生日期', '证件号为 15–18 位数字或 X；出生日期为 Excel 日期或 YYYY-MM-DD。'],
    ['住址 / 紧急联系人 / 紧急电话 / 住院号 / 床号 / 内部备注', '可空，长度上限分别为 200 / 80 / 24 / 60 / 20 / 2000。'],
    ['责任医生 / 负责人 / 来源 / 患者类型 / 首次联系任务', '在导入弹窗统一选择。初始阶段为已建档，风险待评估。'],
    ['虚构填写示例（不参与导入）', '演示对象 / 男 / 66 / 00000000001 / 综合服务 / 虚构管理原因 / DEMO-001'],
  ], '患者中心')
}
