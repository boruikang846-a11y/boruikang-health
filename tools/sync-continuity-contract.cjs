// Generate the 2.2 additive contract; default mode checks committed artifacts.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..')
const read = name => fs.readFileSync(path.join(root, name), 'utf8').replace(/\r\n/g, '\n')
const snake = v => v.replace(/[A-Z]/g, c => '_' + c.toLowerCase())
const common = 'boruikang-health-common/src/main/java/com/boruikang/health'
const admin = 'boruikang-health-admin/boruikang-health-admin/src/main/java/com/boruikang/health/admin'
const requests = {}, endpoints = []
for (const module of ['continuity', 'servicecenter']) {
  const dir = `${common}/${module}/dto`
  for (const file of fs.readdirSync(path.join(root, dir)).filter(f => f.endsWith('Request.java')).sort()) {
    const source = read(`${dir}/${file}`)
    requests[file.replace('.java', '')] = [...source.matchAll(/(?:String|Long|Integer|Boolean|LocalDateTime|LocalDate|int)\s+(\w+)(?=\s*[,\)])/g)].map(m => snake(m[1]))
    assert(requests[file.replace('.java', '')].length, `Unparsed DTO: ${file}`)
  }
  const dir2 = `${admin}/${module}/controller`
  for (const file of fs.readdirSync(path.join(root, dir2)).filter(f => f.endsWith('Controller.java')).sort()) {
    const source = read(`${dir2}/${file}`), base = source.match(/@RequestMapping\("([^"]+)"\)/)?.[1]
    const endpoint = source.match(/@PostMapping\("([^"]+)"\)/)?.[1]
    const request = source.match(/@Valid (?:[\w]+\.)*(\w+Request) (?:request|req)/)?.[1]
    assert(base && endpoint && requests[request], `Unparsed endpoint: ${file}`)
    endpoints.push({ method: 'POST', path: base + endpoint, request })
  }
}
const ddl = read('sql/DDL.sql'), migration = read('sql/CONTINUITY-2.2-migration.sql')
const tables = {}
for (const [, name, body] of migration.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\);/gi)) {
  const full = ddl.match(new RegExp('CREATE TABLE IF NOT EXISTS ' + name + '\\s*\\(([\\s\\S]*?)\\);', 'i'))
  assert(full, `Missing table: ${name}`)
  assert.equal(body.replace(/\s+/g, ' ').trim(), full[1].replace(/\s+/g, ' ').trim(), `Migration drift: ${name}`)
  tables[name] = [...body.matchAll(/(?:^|[\n,])\s*(\w+)\s+(BIGINT|INT|TINYINT|VARCHAR\(\d+\)|DATETIME|DATE|TEXT)/gi)].map(([, column, type]) => ({ column, type }))
}
assert.equal(Object.keys(tables).length, 3)
const contract = { version: 'HEALTH-2.2', disease: 'AF', wecomOwner: 'BORUIKANG', routes: { admin: '/wecom?tab=service', summary: '/after-care?step=patients&patient=:id', patient: '/service' }, requests, endpoints: endpoints.sort((a, b) => a.path.localeCompare(b.path)), tables,
  addedColumns: ['patient_service_entry.service_consent_key', 'patient_service_feedback.patient_reply', 'patient_service_feedback.replied_by', 'patient_service_feedback.replied_at'],
  patientVisibility: 'ACTIVE plan approved by current responsible doctor under current service consent; explicit patient replies only', acceptance: ['one complete case for workflow', 'consecutive enrolled cohort for stability and actual results'] }
const name = 'docs/contracts/continuity-2.2.json', generated = JSON.stringify(contract, null, 2) + '\n'
if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, name), generated)
else assert.equal(read(name), generated, '2.2 contract drift: run node tools/sync-continuity-contract.cjs --write')
console.log(`2.2 contract verified: ${endpoints.length} staff endpoints, ${Object.keys(tables).length} additive tables`)
