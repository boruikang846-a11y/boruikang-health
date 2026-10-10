import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { afterCareStages, canReach, doctorCareStages, homeFor, legacyDestination, preCareStages, selectedMenuPath, stageSearch, patientTabSearch, taskMatchesPatient } from './careNavigation.js'

const app = readFileSync(new URL('./App.jsx', import.meta.url), 'utf8')
const readMenu = name => [...app.match(new RegExp('const ' + name + ' = \\[([\\s\\S]*?)\\n\\]'))[1].matchAll(/\['([^']+)', '([^']+)'/g)].map(match => [match[1], match[2]])
const navigation = readMenu('navigation'), doctorNavigation = readMenu('doctorNavigation')
const menuForSource = app.match(/export function menuFor\(role\) \{[\s\S]*?\n\}/)[0].replace('export ', '')
const menuFor = new Function('navigation', 'doctorNavigation', menuForSource + '; return menuFor')(navigation, doctorNavigation)
const reachable = (role, path) => canReach(role, path, menuFor(role).map(([path]) => path))

test('primary navigation has exactly the requested thirteen entries and order', () => {
  assert.deepEqual(navigation.map(([, title]) => title), ['患者全旅程服务', '企业微信', '公众号', '诊前高危患者筛查中心', '诊后健康服务中心', '宣教服务', '服务包与方案', '渠道管理', '统计与复盘', '医院数据', '医护账号', '运营设置', '系统介绍'])
  assert.equal(new Set(navigation.map(([path]) => path)).size, 13)
})

test('old task, category, patient and date deep links reach their integrated stage intact', () => {
  const migrated = new URL(legacyDestination('/followups', '?task=18&patient=21&contact=1&due_from=2026-10-09'), 'https://test.invalid')
  assert.equal(migrated.pathname, '/after-care')
  assert.equal(migrated.searchParams.get('step'), 'followups')
  for (const [key, value] of [['task', '18'], ['patient', '21'], ['contact', '1'], ['due_from', '2026-10-09']]) assert.equal(migrated.searchParams.get(key), value)
  assert.equal(legacyDestination('/patients/21', '?tab=records'), '/after-care?tab=records&step=patients&patient=21')
  assert.equal(legacyDestination('/patients', '?category=DISCHARGED'), '/after-care?category=DISCHARGED&step=patients')
  assert.equal(legacyDestination('/followups', '?task_type=OUTREACH&sla_overdue=true'), '/screening?task_type=OUTREACH&sla_overdue=true&step=outreach')
  assert.equal(legacyDestination('/doctor/reviews', '?task=18'), '/after-care?task=18&step=reviews')
  assert.equal(legacyDestination('/patients/not-a-number'), null)
})

test('changing stages preserves patient and clears incompatible task and queue filters', () => {
  const next = stageSearch('?patient=21&task=18&category=DISCHARGED&task_type=FOLLOWUP&overdue=1&tab=records', 'appointments')
  assert.deepEqual([...next], [['step', 'appointments'], ['patient', '21']])
})

test('doctor retains clinical deep links without inheriting staff, channel or account routes', () => {
  for (const path of ['/journeys', '/journeys/12', '/after-care', '/patients', '/patients/21', '/doctor', '/doctor/reports', '/doctor/reviews', '/doctor/results', '/doctor/alerts', '/knowledge']) assert.equal(reachable('DOCTOR', path), true, path)
  for (const path of ['/screening', '/followups', '/appointments', '/alerts', '/wecom', '/official-account', '/accounts', '/settings', '/doctor/not-a-route']) assert.equal(reachable('DOCTOR', path), false, path)
  assert.ok(!doctorCareStages.some(([key]) => ['followups', 'invitations', 'appointments', 'referrals', 'intake'].includes(key)))
})

test('staff can reach preserved operational links without doctor-only worklists', () => {
  for (const role of ['MANAGER', 'OPERATOR', 'NURSE']) {
    for (const path of ['/workbench', '/patients/21', '/invitations', '/appointments', '/followups', '/alerts', '/revisits', '/referrals']) assert.equal(reachable(role, path), true, role + path)
    for (const path of ['/doctor', '/doctor/alerts', '/doctor/reviews']) assert.equal(reachable(role, path), false, role + path)
  }
  assert.equal(reachable('MANAGER', '/accounts'), true)
  for (const role of ['OPERATOR', 'NURSE']) for (const path of ['/channels', '/accounts']) assert.equal(reachable(role, path), false)
})

test('platform admin and unknown roles do not acquire patient access through aliases', () => {
  assert.equal(reachable('PLATFORM_ADMIN', '/settings'), true)
  assert.equal(reachable('PLATFORM_ADMIN', '/overview'), true)
  for (const path of ['/patients', '/patients/1', '/workbench', '/after-care', '/screening', '/doctor']) assert.equal(reachable('PLATFORM_ADMIN', path), false, path)
  assert.equal(reachable('UNKNOWN', '/journeys'), false)
  assert.equal(reachable('UNKNOWN', '/patients/1'), false)
})

test('all role landing pages are reachable and every old route selects its parent centre', () => {
  for (const role of ['MANAGER', 'OPERATOR', 'NURSE', 'DOCTOR', 'PLATFORM_ADMIN']) assert.equal(reachable(role, homeFor(role).split('?')[0]), true)
  assert.equal(selectedMenuPath('/patients/21'), '/after-care')
  assert.equal(selectedMenuPath('/invitations'), '/screening')
  assert.equal(selectedMenuPath('/doctor/reports'), '/after-care')
  assert.equal(selectedMenuPath('/journeys/12'), '/journeys')
  assert.equal(selectedMenuPath('/workbench'), '/journeys')
})

test('service stages retain the removed business capabilities', () => {
  for (const stage of ['intake', 'outreach', 'invitations', 'appointments', 'consultation', 'alerts', 'referrals']) assert.ok(preCareStages.some(([key]) => key === stage))
  for (const stage of ['patients', 'followups', 'alerts', 'revisits', 'appointments', 'referrals']) assert.ok(afterCareStages.some(([key]) => key === stage))
})

test('patient detail tabs retain centre, patient and category context', () => {
  const next = patientTabSearch('?step=patients&patient=1001&category=DISCHARGED&tab=records', 'timeline')
  assert.equal(next.get('step'), 'patients')
  assert.equal(next.get('patient'), '1001')
  assert.equal(next.get('category'), 'DISCHARGED')
  assert.equal(next.get('tab'), 'timeline')
})

test('legacy revisit task links open the mixed task queue and keep task filters', () => {
  const migrated = new URL(legacyDestination('/revisits', '?task=81&pending=1'), 'https://test.invalid')
  assert.equal(migrated.searchParams.get('step'), 'revisits')
  assert.equal(migrated.searchParams.get('revisit_view'), 'tasks')
  assert.equal(migrated.searchParams.get('task'), '81')
  assert.equal(migrated.searchParams.get('pending'), '1')
})

test('a task deep link cannot open actions under a different selected patient', () => {
  assert.equal(taskMatchesPatient(1002, 1001), false)
  assert.equal(taskMatchesPatient(1001, 1001), true)
  assert.equal(taskMatchesPatient(1001, '1001'), true)
  assert.equal(taskMatchesPatient(1002, undefined), true)
  assert.equal(taskMatchesPatient(undefined, 1001), false)
})
