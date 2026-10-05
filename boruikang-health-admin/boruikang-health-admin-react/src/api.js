import { useCallback, useEffect, useRef, useState } from 'react'

const key = 'health.admin.session'
export function token() { return sessionStorage.getItem(key) }
export function setToken(value) { value ? sessionStorage.setItem(key, value) : sessionStorage.removeItem(key) }
export async function api(path, body) {
  return request(path, body, false)
}
export async function uploadPatientFile(settings, file) {
  const form = new FormData()
  form.append('settings', new Blob([JSON.stringify(settings)], { type: 'application/json' }))
  form.append('file', file)
  return request('/patients/import_file', form, true)
}
async function request(path, body, multipart) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45000)
  try {
    const response = await fetch('/boruikang/admin' + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { ...(!multipart ? { 'Content-Type': 'application/json' } : {}), ...(token() ? { Jwttoken: token() } : {}) },
      ...(body === undefined ? {} : { body: multipart ? body : JSON.stringify(body) }), signal: controller.signal,
    })
    const data = await response.json()
    if (!response.ok || !data.success) {
      if (response.status === 401 && path !== '/login') {
        setToken(null)
        window.dispatchEvent(new Event('health-session-expired'))
      }
      throw new Error(data.message || '请求失败，请重试')
    }
    return data.result
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('请求超时，请刷新核对结果后重试')
    throw error
  } finally { clearTimeout(timeout) }
}

export function useLoad(loader, dependencies = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const [revision, setRevision] = useState(0)
  const sequence = useRef(0)
  const reload = useCallback(() => setRevision(value => value + 1), [])
  useEffect(() => {
    const id = ++sequence.current
    setState({ data: null, loading: true, error: null })
    Promise.resolve().then(loader).then(
      data => { if (sequence.current === id) setState({ data, loading: false, error: null }) },
      error => { if (sequence.current === id) setState({ data: null, loading: false, error: error.message }) },
    )
    return () => { sequence.current++ }
  }, [...dependencies, revision])
  return { ...state, reload }
}
