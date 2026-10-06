import test from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import { decodeCsv, fileImportResult, importDate, MAX_IMPORT_BYTES, newImportBatch, parseCsvText, readImportFile } from './fileImport.js'
import { createScreeningTemplate, normalizeScreeningRows, parseScreeningFile } from './screeningImport.js'
import { createPatientTemplate, normalizePatientRows, parsePatientFile } from './patientImport.js'

const file = (name, buffer) => ({ name, size: buffer.byteLength, arrayBuffer: async () => buffer })
const csv = (text, name = '名单.csv') => file(name, new TextEncoder().encode(text))
const screeningHeader = '姓名,性别,年龄,联系电话,发现时间,发现结论,分类,来源编号,证件尾号\n'
const patientHeader = '姓名,性别,年龄,联系电话,科室,病种/管理原因,来源编号,证件号,出生日期\n'

test('CSV handles Chinese, quoted commas, escaped quotes, multiline fields and physical line numbers', async () => {
  const result = await parseScreeningFile(csv('\uFEFF' + screeningHeader + '\n演示,男,66,00000000001,2026-09-30 08:30,"结论,含逗号\n和""引号""",筛查,DEMO-1,001234\n\n演示二,女,0,00000000002,,结论,,,\n'))
  assert.equal(result.errors.length, 0); assert.equal(result.rows.length, 2)
  assert.equal(result.rows[0].finding, '结论,含逗号\n和"引号"'); assert.equal(result.rows[0].id_card_tail, '001234')
  assert.equal(result.rows[0].phone, '00000000001'); assert.deepEqual(result.entries.map(entry => entry.line), [3, 6])
  assert.equal(result.rows[1].age, 0); assert.equal(result.rows[1].screened_at, undefined)
})
test('CSV supports reordered English headers, extra columns, semicolons and tabs', () => {
  for (const delimiter of [';', '\t']) {
    const records = parseCsvText(['phone', 'finding', 'name', '额外列'].join(delimiter) + '\n' + ['00000000001', '结论', '演示', '忽略'].join(delimiter))
    const result = normalizeScreeningRows(records)
    assert.equal(result.rows[0].name, '演示'); assert.deepEqual(result.ignoredColumns, ['额外列'])
  }
})
test('CSV decodes UTF8 BOM, GB18030, UTF16LE and UTF16BE', () => {
  assert.equal(decodeCsv(new TextEncoder().encode('\uFEFF姓名')), '姓名')
  assert.equal(decodeCsv(Uint8Array.from([0xd0, 0xd5, 0xc3, 0xfb])), '姓名')
  assert.equal(decodeCsv(Uint8Array.from([0xff, 0xfe, 0xd3, 0x59, 0x0d, 0x54])), '姓名')
  assert.equal(decodeCsv(Uint8Array.from([0xfe, 0xff, 0x59, 0xd3, 0x54, 0x0d])), '姓名')
})
test('invalid dates never silently become defaults or roll into another month', () => {
  for (const value of ['2026-02-29', '2026-13-01', '2026-09-30 24:00', 'not-a-date', '2026-09-30 08:60']) assert.equal(importDate(value), null)
  assert.equal(importDate('2024/2/29 8:30:01'), '2024-02-29T08:30:01')
  assert.equal(importDate('2026-09-30', true), '2026-09-30')
})
test('invalid row fields retain original line numbers and prevent submission', async () => {
  const result = await parseScreeningFile(csv(screeningHeader + '演示,其他,130.5,abc,2026-02-30,,分类,' + 'x'.repeat(81) + ',1234567'))
  assert.equal(result.errors.length, 1); assert.equal(result.errors[0].line, 2)
  for (const field of ['联系电话', '性别', '年龄', '发现时间', '发现结论', '来源编号', '证件尾号']) assert.ok(result.errors[0].errors.some(error => error.includes(field)), field)
})
test('missing, duplicate, empty headers and malformed CSV are rejected', async () => {
  await assert.rejects(parseScreeningFile(csv('姓名,电话\n演示,00000000001')), /缺少必填表头/)
  await assert.rejects(parseScreeningFile(csv('姓名,name,电话,发现结论\n演示,演示,00000000001,结论')), /表头重复/)
  await assert.rejects(parseScreeningFile(csv(screeningHeader)), /没有数据行/)
  await assert.rejects(parseScreeningFile(csv(screeningHeader + '"演示,男,66')), /CSV 格式错误/)
  const result = normalizeScreeningRows([{ line: 1, cells: ['姓名', '电话', '发现结论', ''] }, { line: 2, cells: ['演示', '00000000001', '结论', '丢失数据'] }])
  assert.match(result.errors[0].errors[0], /没有表头/)
})
test('accepts 500 data rows, rejects 501 rows, oversize, empty and unsupported files', async () => {
  const row = '演示,未知,20,00000000001,,结论,,,\n'
  assert.equal((await parseScreeningFile(csv(screeningHeader + row.repeat(500)))).rows.length, 500)
  await assert.rejects(parseScreeningFile(csv(screeningHeader + row.repeat(501))), /最多导入 500/)
  await assert.rejects(readImportFile({ name: '名单.csv', size: MAX_IMPORT_BYTES + 1 }), /5 MiB/)
  await assert.rejects(readImportFile({ name: '名单.csv', size: 0 }), /文件为空/)
  await assert.rejects(readImportFile({ name: '名单.xls', size: 1 }), /仅支持/)
  await assert.rejects(readImportFile(csv('broken', '名单.xlsx')), /无法读取 Excel/)
})
test('Excel dates, leading zeros, rich text and original sheet row numbers survive reading', async () => {
  const workbook = new ExcelJS.Workbook(), sheet = workbook.addWorksheet('筛查名单')
  sheet.getRow(2).values = ['姓名', '电话', '发现结论', '发现时间', '证件尾号']
  sheet.getRow(5).values = [{ richText: [{ text: '演' }, { text: '示' }] }, '00000000001', '结论', new Date('2026-09-30T08:30:00Z'), 1234]
  sheet.getCell('E5').numFmt = '000000'
  const result = await parseScreeningFile(file('名单.xlsx', await workbook.xlsx.writeBuffer()))
  assert.equal(result.errors.length, 0); assert.equal(result.entries[0].line, 5); assert.equal(result.sheetName, '筛查名单')
  assert.equal(result.rows[0].name, '演示'); assert.equal(result.rows[0].screened_at, '2026-09-30T08:30:00'); assert.equal(result.rows[0].id_card_tail, '001234')
})
test('formula cells are rejected rather than importing their cached results', async () => {
  const workbook = new ExcelJS.Workbook(), sheet = workbook.addWorksheet('名单')
  sheet.addRow(['姓名', '电话', '发现结论']); sheet.addRow(['演示', '00000000001', { formula: '"结论"', result: '结论' }])
  const result = await parseScreeningFile(file('名单.xlsx', await workbook.xlsx.writeBuffer()))
  assert.equal(result.errors.length, 1); assert.ok(result.errors[0].errors.some(error => error.includes('公式')))
})
test('both templates have empty data sheets, text identifiers and a separate guide', async () => {
  for (const [make, parse, sheetName] of [[createScreeningTemplate, parseScreeningFile, '患者池'], [createPatientTemplate, parsePatientFile, '患者中心']]) {
    const buffer = await make(), workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(buffer)
    assert.equal(workbook.worksheets[0].name, sheetName); assert.equal(workbook.worksheets[0].actualRowCount, 1)
    assert.equal(workbook.worksheets[0].getColumn(4).numFmt, '@'); assert.equal(workbook.worksheets[1].name, '填写说明')
    await assert.rejects(parse(file('模板.xlsx', buffer)), /没有数据行/)
  }
})
test('patient rows support required fields, identifiers and optional profile fields', async () => {
  const result = await parsePatientFile(csv(patientHeader + '演示,女,66,00000000001,综合服务,虚构管理原因,001,00000000000000000x,1960-01-01'))
  assert.equal(result.errors.length, 0); assert.equal(result.rows[0].id_card, '00000000000000000X'); assert.equal(result.rows[0].external_id, '001')
  assert.equal(result.rows[0].birth_date, '1960-01-01'); assert.equal(result.rows[0].department, '综合服务')
  const invalid = normalizePatientRows(parseCsvText(patientHeader + '演示,男,,00000000001,,病种,,123,2026-02-30'))
  for (const field of ['年龄', '科室', '证件号', '出生日期']) assert.ok(invalid.errors[0].errors.some(error => error.includes(field)))
})
test('batch keys are valid and distinct; backend record numbers map to physical file rows', () => {
  const first = newImportBatch(), second = newImportBatch(); assert.match(first, /^[a-zA-Z0-9-]{1,60}$/); assert.notEqual(first, second)
  assert.equal(fileImportResult({ messages: ['第2行：已存在，跳过'] }, [{ line: 2 }, { line: 5 }]).messages[0], '文件第 5 行：已存在，跳过')
})
