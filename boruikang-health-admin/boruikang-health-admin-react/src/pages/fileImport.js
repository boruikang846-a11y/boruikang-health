import Papa from 'papaparse'

export const MAX_IMPORT_ROWS = 500
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024
export const importText = value => value == null ? '' : value instanceof Date ? (Number.isNaN(value.getTime()) ? '无效日期' : value.toISOString().slice(0, 19)) : typeof value === 'object' ? '' : String(value).trim()
const nonempty = cells => cells.some(value => value != null && (typeof value === 'object' || importText(value) !== ''))

/** Preserve physical line numbers through quoted multiline CSV fields and blank rows. */
export function parseCsvText(input) {
  const source = input.replace(/^\uFEFF/, '')
  const records = []
  let line = 1, cursor = 0, failure
  Papa.parse(source, {
    delimitersToGuess: [',', '\t', ';'], skipEmptyLines: false,
    step(result, parser) {
      if (result.errors.length) { failure = new Error('第 ' + line + ' 行：CSV 格式错误，请检查引号和分隔符'); parser.abort(); return }
      if (nonempty(result.data)) records.push({ line, cells: result.data })
      if (records.length > MAX_IMPORT_ROWS + 1) { failure = new Error('每个文件最多导入 500 条记录，请拆分文件'); parser.abort(); return }
      line += (source.slice(cursor, result.meta.cursor).match(/\r\n|\r|\n/g) || []).length
      cursor = result.meta.cursor
    },
  })
  if (failure) throw failure
  return records
}

export function decodeCsv(buffer) {
  const bytes = new Uint8Array(buffer)
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le', { fatal: true }).decode(bytes)
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be', { fatal: true }).decode(bytes)
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
  catch { return new TextDecoder('gb18030', { fatal: true }).decode(bytes) }
}

export function importDate(value, dateOnly = false) {
  if (!value) return undefined
  const match = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
  if (!match) return null
  const [year, month, day, hour, minute, second] = match.slice(1).map(part => Number(part || 0))
  const check = new Date(0)
  check.setUTCFullYear(year, month - 1, day); check.setUTCHours(hour, minute, second, 0)
  if (year < 1900 || year > 9999 || check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day || check.getUTCHours() !== hour || check.getUTCMinutes() !== minute || check.getUTCSeconds() !== second) return null
  return check.toISOString().slice(0, dateOnly ? 10 : 19)
}

export function mapImportTable(records, columns) {
  const populated = records.filter(record => nonempty(record.cells))
  if (!populated.length) throw new Error('文件为空，请按模板填写后重新选择')
  const header = populated[0].cells.map(importText)
  const headerKeys = new Map(columns.flatMap(column => [column.key, ...(column.aliases || [column.title])].map(value => [value.replace(/\s/g, ''), column.key])))
  const keys = header.map(value => headerKeys.get(value.replace(/\s/g, '')))
  const seen = new Set()
  keys.forEach((key, index) => { if (!key) return; if (seen.has(key)) throw new Error('表头重复：' + header[index] + '，请只保留一列'); seen.add(key) })
  const missing = columns.filter(column => column.required && !seen.has(column.key))
  if (missing.length) throw new Error('缺少必填表头：' + missing.map(column => column.title).join('、') + '，请使用导入模板')
  const data = populated.slice(1)
  if (!data.length) throw new Error('文件没有数据行，请在表头下方填写患者记录')
  if (data.length > MAX_IMPORT_ROWS) throw new Error('每个文件最多导入 500 条记录，请拆分文件')
  return { ignoredColumns: header.filter((value, index) => value && !keys[index]), entries: data.map(({ line, cells }) => {
    const values = {}, errors = []
    cells.forEach((value, index) => {
      if (!keys[index]) { if (!header[index] && nonempty([value])) errors.push('第 ' + (index + 1) + ' 列没有表头，请补充表头或移除该列数据'); return }
      if (value != null && typeof value === 'object' && !(value instanceof Date)) errors.push(header[index] + '：不支持公式或错误单元格，请改为普通值')
      values[keys[index]] = importText(value)
    })
    return { line, values, errors }
  }) }
}

export function validateImportFields(entry, columns) {
  for (const column of columns) {
    const value = entry.values[column.key]
    if (column.required && !value) entry.errors.push(column.title + '不能为空')
    if (column.max && value?.length > column.max) entry.errors.push(column.title + '最多 ' + column.max + ' 字')
  }
  if (entry.values.phone && !/^[+0-9 -]{6,24}$/.test(entry.values.phone)) entry.errors.push('联系电话须为 6–24 位数字、空格、加号或短横线')
  const gender = { 男: 'MALE', 女: 'FEMALE', 未知: 'UNKNOWN', MALE: 'MALE', FEMALE: 'FEMALE', UNKNOWN: 'UNKNOWN' }[(entry.values.gender || 'UNKNOWN').toUpperCase()]
  if (!gender) entry.errors.push('性别只接受男、女、未知或 MALE/FEMALE/UNKNOWN')
  const age = entry.values.age ? Number(entry.values.age) : undefined
  if (entry.values.age && (!/^\d+$/.test(entry.values.age) || !Number.isInteger(age) || age < 0 || age > 130)) entry.errors.push('年龄必须为 0–130 的整数')
  return { ...entry.values, gender, age }
}

export function finishImportTable(table) {
  return { ...table, errors: table.entries.filter(entry => entry.errors.length), rows: table.entries.map(entry => Object.fromEntries(Object.entries(entry.row).filter(([, value]) => value !== '' && value != null))) }
}

export async function readImportFile(file) {
  const extension = file.name.split('.').pop().toLowerCase()
  if (!['xlsx', 'csv'].includes(extension)) throw new Error('仅支持 .xlsx 或 .csv 文件；旧版 .xls 请另存为 .xlsx')
  if (!file.size) throw new Error('文件为空，请重新选择')
  if (file.size > MAX_IMPORT_BYTES) throw new Error('文件不能超过 5 MiB，请拆分后导入')
  const buffer = await file.arrayBuffer()
  if (extension === 'csv') return { records: parseCsvText(decodeCsv(buffer)), sheetName: null }
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  try { await workbook.xlsx.load(buffer) } catch { throw new Error('无法读取 Excel 文件，请确认文件未损坏、未加密，并另存为 .xlsx 后重试') }
  const sheet = workbook.worksheets.find(worksheet => worksheet.actualRowCount > 0)
  if (!sheet) throw new Error('Excel 没有非空工作表')
  const records = []
  sheet.eachRow(row => {
    const cells = []
    row.eachCell({ includeEmpty: true }, (cell, column) => {
      let value = cell.value
      if (value?.richText) value = value.richText.map(run => run.text).join('')
      if (typeof value === 'number' && Number.isInteger(value) && /^0+$/.test(cell.numFmt || '')) value = String(value).padStart(cell.numFmt.length, '0')
      cells[column - 1] = value
    })
    if (nonempty(cells)) records.push({ line: row.number, cells })
    if (records.length > MAX_IMPORT_ROWS + 1) throw new Error('每个文件最多导入 500 条记录，请拆分文件')
  })
  return { records, sheetName: sheet.name }
}

export async function createImportTemplate(columns, instructions, sheetName) {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook(), sheet = workbook.addWorksheet(sheetName)
  sheet.columns = columns.map(column => ({ header: column.title, key: column.key, width: ['finding', 'disease', 'note', 'address'].includes(column.key) ? 40 : 20 }))
  for (const column of columns) if (!['age', 'screened_at', 'birth_date'].includes(column.key)) sheet.getColumn(column.key).numFmt = '@'
  sheet.getRow(1).font = { bold: true }; sheet.views = [{ state: 'frozen', ySplit: 1 }]
  const guide = workbook.addWorksheet('填写说明')
  guide.columns = [{ header: '字段', width: 22 }, { header: '填写要求', width: 80 }]
  guide.addRows([['文件要求', '仅导入第一个非空工作表；表头下填写记录，最多 500 条、5 MiB。请勿删除必填表头。'], ...instructions])
  return workbook.xlsx.writeBuffer()
}

export function newImportBatch() {
  const now = new Date()
  const timestamp = [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((value, index) => String(value).padStart(index ? 2 : 4, '0')).join('')
    + '-' + [now.getHours(), now.getMinutes(), now.getSeconds()].map(value => String(value).padStart(2, '0')).join('') + '-' + String(now.getMilliseconds()).padStart(3, '0')
  return 'B' + timestamp + '-' + crypto.randomUUID().slice(0, 8)
}

export function fileImportResult(response, entries) {
  return { ...response, messages: response.messages.map(message => message.replace(/^第(\d+)行/, (match, index) => entries[Number(index) - 1] ? '文件第 ' + entries[Number(index) - 1].line + ' 行' : match)) }
}
