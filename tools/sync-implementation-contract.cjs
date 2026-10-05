// Generate the prototype contract from the implemented Java, React and SQL sources.
// Without --write this is a CI drift check, never a source rewrite.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const snake = value => value.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
const common = 'boruikang-health-common/src/main';
const service = read(common + '/java/com/boruikang/health/journey/service/JourneyService.java');
const app = read('boruikang-health-admin/boruikang-health-admin-react/src/App.jsx');
const paths = {};
for (const kind of ['OUTPATIENT', 'DISCHARGE']) {
  const definition = service.match(new RegExp('List<JourneyResponse.Step> ' + kind + '=List.of\\(([^;]+)\\);'));
  assert(definition, 'Missing backend journey path: ' + kind);
  paths[kind] = [...definition[1].matchAll(/s\("([^"]+)","([^"]+)","([^"]+)"\)/g)].map(([, code, title, responsibility]) => ({ code, title, responsibility }));
  assert(paths[kind].length > 0);
}
const navigation = name => {
  const definition = app.match(new RegExp('const ' + name + ' = \\[([\\s\\S]*?)\\n\\]'));
  assert(definition, 'Missing React navigation ' + name);
  return [...definition[1].matchAll(/\['([^']+)', '([^']+)'/g)].map(([, route, title]) => [route, title]);
};
const requests = {};
const patterns = {};
const dtoDir = common + '/java/com/boruikang/health/journey/dto';
for (const filename of fs.readdirSync(path.join(root, dtoDir)).filter(f => f.endsWith('Request.java')).sort()) {
  const source = read(dtoDir + '/' + filename);
  requests[filename.replace('.java', '')] = [...source.matchAll(/(?:String|Long|Integer|Boolean|LocalDateTime|List<[^>]+>)\s+(\w+)(?=\s*[,\)])/g)].map(m => snake(m[1]));
  assert(requests[filename.replace('.java', '')].length, 'Unparsed DTO ' + filename);
  patterns[filename.replace('.java', '')] = Object.fromEntries([...source.matchAll(/@Pattern\(regexp="([^"]+)"\)\s+(?:@[\w]+(?:\([^)]*\))?\s+)*String\s+(\w+)/g)].map(([, pattern, field]) => [snake(field), pattern]));
}
const endpoints = {};
const controllerDir = 'boruikang-health-admin/boruikang-health-admin/src/main/java/com/boruikang/health/admin/journey/controller';
for (const filename of fs.readdirSync(path.join(root, controllerDir)).filter(f => f.endsWith('Controller.java')).sort()) {
  const source = read(controllerDir + '/' + filename);
  const base = source.match(/@RequestMapping\("([^"]+)"\)/)?.[1];
  const endpoint = source.match(/@PostMapping\("([^"]+)"\)/)?.[1];
  const request = source.match(/@Valid (\w+Request) req/)?.[1];
  assert(base && endpoint && requests[request], 'Unparsed journey controller ' + filename);
  endpoints[request] = { method: 'POST', path: base + endpoint };
}
assert.equal(Object.keys(endpoints).length, Object.keys(requests).length, 'Journey endpoint/DTO mismatch');
function schema(source) {
  const tables = {};
  for (const [, name, definition] of source.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\);/gi)) {
    tables[name] = Object.fromEntries([...definition.matchAll(/(?:^|[\n,])\s*(\w+)\s+(BIGINT|INTEGER|INT|TINYINT(?:\(\d+\))?|BOOLEAN|VARCHAR\(\d+\)|DATETIME|DATE|TEXT|LONGTEXT|DECIMAL\([\d,]+\))/gi)].map(([, column, type]) => [column, type.toUpperCase()]));
    assert(Object.keys(tables[name]).length, 'Unparsed SQL table ' + name);
  }
  assert(Object.keys(tables).length > 20, 'Incomplete SQL schema');
  return tables;
}
const tables = schema(read('sql/DDL.sql')), local = schema(read('sql/DDL-local.sql'));
assert.deepEqual(local, tables, 'MySQL / local table columns or types have drifted');
const migrationSource = read('sql/JOURNEY-2.0-migration.sql');
for (const [, name, body] of migrationSource.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)\s*\(([\s\S]*?)\);/gi)) {
  const full = read('sql/DDL.sql').match(new RegExp('CREATE TABLE IF NOT EXISTS ' + name + '\\s*\\(([\\s\\S]*?)\\);', 'i'));
  assert(full, 'Migration table absent from complete DDL: ' + name);
  assert.equal(body.replace(/\s+/g, ' ').trim(), full[1].replace(/\s+/g, ' ').trim(), 'Migration structure/index drift: ' + name);
}
const audit = ['id', 'del_flag', 'creator', 'modifier', 'gmt_create', 'gmt_modified'];
let checkedMappers = 0;
const mapperDir = common + '/resources/mybatis/mapper';
for (const filename of fs.readdirSync(path.join(root, mapperDir)).filter(f => f.endsWith('Mapper.xml'))) {
  const source = read(mapperDir + '/' + filename), columns = source.match(/<sql id="columns">([\s\S]*?)<\/sql>/);
  const table = source.match(/\bFROM\s+(\w+)/i)?.[1];
  if (!columns || !table) continue;
  assert(tables[table], 'Mapper table missing from SQL: ' + table);
  const selected = columns[1].replace(/<include[^>]*\/>/g, audit.join(',')).split(',').map(c => c.trim()).filter(Boolean);
  assert.deepEqual([...new Set(selected)].sort(), Object.keys(tables[table]).sort(), 'Mapper / SQL columns differ: ' + filename);
  const model = source.match(/type="com\.boruikang\.health\.model\.(\w+)"/)?.[1];
  if (model) {
    const mapping = Object.fromEntries([...source.matchAll(/<(?:result|id)\s+column="([^"]+)"\s+property="([^"]+)"/g)].map(([, column, property]) => [property, column]));
    const fields = [...read(common + '/java/com/boruikang/health/model/' + model + '.java').matchAll(/public\s+[\w.<>]+\s+(\w+)\s*;/g)].map(m => mapping[m[1]] || snake(m[1]));
    assert.deepEqual([...audit, ...fields].sort(), Object.keys(tables[table]).sort(), 'Model / SQL columns differ: ' + model);
  }
  checkedMappers++;
}
assert(checkedMappers > 20, 'Too few checked MyBatis mappers');
const statuses = { INTAKE: '待负责人接收', ACTIVE: '服务进行中', PAUSED: '已暂停', EXITED: '已退出', CLOSED: '本次服务已结案' };
const backendStatuses = new Set([...service.matchAll(/(?:j|x)\.status\s*=\s*"(\w+)"/g)].map(m => m[1]));
for (const [, block] of service.matchAll(/x\.status=switch\(req\.action\(\)\)\{([^}]+)\}/g)) for (const [, value] of block.matchAll(/->"(\w+)"/g)) backendStatuses.add(value);
assert.deepEqual([...backendStatuses].sort(), Object.keys(statuses).sort(), 'Backend journey statuses changed; update labels and prototype behavior');
const contract = {
  version: 'HEALTH-2.0',
  journey: { paths, statuses, planStatuses: { DRAFT: '待责任医生审核', APPROVED: '已批准', REJECTED: '已退回', SUPERSEDED: '已替代' }, caseStatuses: { OPEN: '待接单', ACCEPTED: '处理中', RESOLVED: '已有处理结果，待反馈核验', CLOSED: '反馈已核验，闭环' }, requests, patterns, endpoints },
  navigation: { operations: navigation('navigation'), doctor: navigation('doctorNavigation') },
  patientImport: { maxBytes: 5 * 1024 * 1024, maxRows: 500, outreachDeadline: 'SLA', pendingConsent: true, lifecycle: 'ENROLLED', riskLevel: 'UNKNOWN', defaultFirstContactHours: Number(read(common + '/java/com/boruikang/health/org/service/SlaResolver.java').match(/default->\{row.firstContactHours=(\d+)/)[1]), metadata: [...read(common + '/java/com/boruikang/health/patient/dto/ImportPatientFileRequest.java').matchAll(/(?:String|Long|Boolean)\s+(\w+)(?=\s*[,\)])/g)].map(m => snake(m[1])) },
  tables,
};
const patientService = read(common + '/java/com/boruikang/health/patient/service/PatientService.java');
assert(patientService.includes('p.lifecycle="ENROLLED"') && patientService.includes('"UNKNOWN"'), 'Patient import defaults changed');
assert(read(common + '/java/com/boruikang/health/patient/service/PatientFileImportService.java').includes('file.getSize()<=5*1024*1024'), 'Upload limit changed');
assert(read(common + '/java/com/boruikang/health/patient/dto/ImportPatientsRequest.java').includes('@Size(max=500)'), 'Import row limit changed');
assert(read(common + '/java/com/boruikang/health/task/service/OutreachService.java').includes('sla.firstContactDue(p.riskLevel,now)'), 'Outreach deadline behavior changed');
assert(!contract.patientImport.metadata.includes('outreach_due'), 'New import deadline field must be reflected in prototype');
const json = JSON.stringify(contract, null, 2) + '\n';
const js = '// Generated by tools/sync-implementation-contract.cjs; do not edit.\nconst implementationContract = ' + JSON.stringify(contract) + ';\n';
const apiDoc = '# HEALTH 2.0 全旅程 API\n\n<!-- Generated by tools/sync-implementation-contract.cjs; do not edit. -->\n\n当前业务约束见 [全旅程需求](../feature/journey-2.0.md) 和 [四层同步基线](../contracts/README.md)。所有请求字段为 snake_case，每个接口独立 Controller / DTO；响应为 JourneyResponse 或分页/统计 DTO。\n\n| 请求 DTO | 方法与路径 | body 字段 |\n| --- | --- | --- |\n' + Object.entries(endpoints).map(([dto, endpoint]) => `| ${dto} | ${endpoint.method} ${endpoint.path} | ${requests[dto].map(x=>'\x60'+x+'\x60').join(', ')} |`).join('\n') + '\n\n变更携带 id、version、request_id 与依据；create 使用来源事件去重。相同请求键、操作者和内容重试返回已保存响应，变化内容或操作者拒绝。计划 nodes 使用 PlanNodeDto（seq、stage、offset_days、task_type、title、priority、checklist）。\n\n| 当前步骤 | 可执行人员 |\n| --- | --- |\n' + paths.OUTPATIENT.map(s=>`| ${s.code} / ${s.title} | ${s.responsibility} |`).join('\n') + '\n\n出院路径：' + paths.DISCHARGE.map(s=>s.code).join(' → ') + '。OWNER 为当前负责人本人；DOCTOR 为当前责任医生本人；OPERATIONS 为按医院和患者权限范围授权的主管、护士、运营。平台账号不得访问患者旅程。\n\nCLOSE 仅接受 VERIFIED / NONE，退出走 status EXIT；满意度 RATED 才携带 1–5 分，其他结果不携带分值。病历、任务、预约复用已有 API；当前计划随访完成并经医生查收、所有问题闭环才可结案。\n';
for (const [file, expected] of [['docs/contracts/health-2.0.json', json], ['docs/demo-static/web/implementation-contract.js', js], ['docs/api/journey-2.0.md', apiDoc]]) {
  if (process.argv.includes('--write')) { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), expected); }
  else assert.equal(read(file), expected, file + ' is stale; run node tools/sync-implementation-contract.cjs --write');
}
console.log(`Implementation contract verified: ${Object.keys(tables).length} tables, ${checkedMappers} mappers/models, ${Object.keys(requests).length} journey DTOs, both paths and React navigation.`);
