// Keep compatibility paths separate from the visible menu: hiding a menu must not
// break task links or grant the clinical actions of another role.
const staffRoles = ['MANAGER', 'OPERATOR', 'NURSE']
const legacyStages = {
  '/workbench': ['/journeys', 'workbench'],
  '/patients': ['/after-care', 'patients'],
  '/invitations': ['/screening', 'invitations'],
  '/appointments': ['/screening', 'appointments'],
  '/followups': ['/after-care', 'followups'],
  '/alerts': ['/after-care', 'alerts'],
  '/revisits': ['/after-care', 'revisits'],
  '/referrals': ['/after-care', 'referrals'],
  '/doctor': ['/after-care', 'doctor-workbench'],
  '/doctor/reviews': ['/after-care', 'reviews'],
  '/doctor/reports': ['/after-care', 'reports'],
  '/doctor/results': ['/after-care', 'results'],
  '/doctor/alerts': ['/after-care', 'alerts'],
}

export function legacyDestination(pathname, search = '') {
  const patientMatch = pathname.match(/^\/patients\/(\d+)$/)
  let stage = legacyStages[patientMatch ? '/patients' : pathname]
  if (!stage) return null
  const params = new URLSearchParams(search)
  if (pathname === '/followups' && params.get('task_type') === 'OUTREACH') stage = ['/screening', 'outreach']
  params.set('step', stage[1])
  if (pathname === '/revisits') params.set('revisit_view', 'tasks')
  if (patientMatch) params.set('patient', patientMatch[1])
  return stage[0] + '?' + params.toString()
}

export function homeFor(role) {
  return role === 'PLATFORM_ADMIN' ? '/settings' : role === 'DOCTOR' ? '/after-care?step=doctor-workbench' : '/journeys'
}

export function canReach(role, pathname, menuPaths) {
  if (!['PLATFORM_ADMIN', 'DOCTOR', ...staffRoles].includes(role)) return false
  if (menuPaths.some(path => pathname === path || path === '/journeys' && /^\/journeys\/\d+$/.test(pathname))) return true
  if (role === 'PLATFORM_ADMIN') return false
  if (/^\/patients(?:\/\d+)?$/.test(pathname)) return true
  if (role === 'DOCTOR') return ['/doctor', '/doctor/reviews', '/doctor/reports', '/doctor/results', '/doctor/alerts'].includes(pathname)
  return Object.hasOwn(legacyStages, pathname) && !pathname.startsWith('/doctor')
}

export function selectedMenuPath(pathname) {
  const destination = legacyDestination(pathname)
  if (destination) return destination.split('?')[0]
  if (pathname.startsWith('/journeys/')) return '/journeys'
  return pathname
}

export function stageSearch(search, step) {
  // Only patient context belongs to every stage. A task, category or due-date
  // filter from the previous stage must not silently change the next queue.
  const current = new URLSearchParams(search)
  const next = new URLSearchParams({ step })
  if (current.get('patient')) next.set('patient', current.get('patient'))
  return next
}

export function patientTabSearch(search, tab) {
  const next = new URLSearchParams(search)
  next.set('tab', tab)
  return next
}

export function taskMatchesPatient(taskPatientId, expectedPatientId) {
  return expectedPatientId == null || Number(taskPatientId) === Number(expectedPatientId)
}

export const preCareStages = [
  ['intake', '筛查名单与分层'], ['outreach', '首次联系'], ['invitations', '邀约记录'],
  ['appointments', '预约到诊'], ['consultation', '诊前咨询'], ['alerts', '异常处理'], ['referrals', '转诊衔接'],
]
export const afterCareStages = [
  ['overview', '干预总览'], ['patients', '患者档案'], ['followups', '随访与咨询'], ['invitations', '复诊邀约'],
  ['alerts', '异常处理'], ['revisits', '复诊跟踪'], ['appointments', '预约到诊'], ['referrals', '转诊衔接'],
]
export const doctorCareStages = [
  ['doctor-workbench', '医生待办'], ['overview', '干预总览'], ['patients', '我的患者'],
  ['reports', '查看报告'], ['reviews', '随访意见审核'], ['results', '结果查收'], ['alerts', '异常处置'],
]
