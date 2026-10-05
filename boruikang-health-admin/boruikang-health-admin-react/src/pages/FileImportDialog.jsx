import React, { useEffect, useRef, useState } from 'react'
import { Alert, Button, Form, Input, Modal, Space, Spin, Table, Tag } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import { newImportBatch } from './fileImport'

/** Mounted only while open; local patient data is released on close. */
export default function FileImportDialog({ title, description, columns, parseFile, createTemplate, templateName, initialValues, onClose, onSubmit, children }) {
  const [form] = Form.useForm()
  const [preview, setPreview] = useState(null), [fileName, setFileName] = useState('')
  const [reading, setReading] = useState(false), [busy, setBusy] = useState(false)
  const [downloading, setDownloading] = useState(false), [error, setError] = useState(null)
  const sequence = useRef(0), submitting = useRef(false), batch = useRef(''), selectedFile = useRef(null)
  useEffect(() => () => { sequence.current++ }, [])
  const selectFile = async event => {
    const file = event.target.files?.[0], id = ++sequence.current
    selectedFile.current = file || null; setPreview(null); setError(null); setFileName(file?.name || ''); setReading(Boolean(file))
    if (!file) return
    batch.current = newImportBatch()
    try { const parsed = await parseFile(file); if (id === sequence.current) setPreview(parsed) }
    catch (failure) { if (id === sequence.current) setError(failure.message) }
    finally { if (id === sequence.current) setReading(false) }
  }
  const download = async () => {
    setDownloading(true); setError(null)
    try {
      const buffer = await createTemplate()
      const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
      const link = document.createElement('a'); link.href = url; link.download = templateName; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (failure) { setError('模板下载失败：' + failure.message) }
    finally { setDownloading(false) }
  }
  const canSubmit = preview && !preview.errors.length && !reading
  return <Modal title={title} open width={1040} maskClosable={false} closable={!busy} onCancel={() => !busy && onClose()}
    footer={<Space><Button disabled={busy} onClick={onClose}>取消</Button><Button type="primary" disabled={!canSubmit} loading={busy} onClick={() => form.submit()}>确认导入{preview ? '（' + preview.rows.length + ' 条）' : ''}</Button></Space>}>
    <Alert className="mb" type="info" showIcon message="支持 Excel（.xlsx）和 CSV，最多 500 条、5 MiB" description={description} />
    <Space className="mb"><Button icon={<DownloadOutlined />} loading={downloading} disabled={busy} onClick={download}>下载 Excel 模板</Button></Space>
    <Form form={form} layout="vertical" initialValues={initialValues} disabled={busy} onFinish={async values => {
      if (!canSubmit || submitting.current) return
      submitting.current = true; setBusy(true); setError(null)
      try { await onSubmit(values, preview, batch.current, selectedFile.current); onClose() }
      catch (failure) { setError(failure.message); submitting.current = false; setBusy(false) }
    }}>{children}<Form.Item label="选择导入文件"><Input type="file" aria-label="选择导入文件" accept=".xlsx,.csv" disabled={busy} onChange={selectFile} /></Form.Item></Form>
    {error && <Alert className="mb" type="error" showIcon message={error} />}
    {reading && <div className="loading"><Spin /><span>正在读取并校验文件…</span></div>}
    {preview && <><p className="muted">{fileName}{preview.sheetName ? ' / 工作表：' + preview.sheetName : ''} · 共 {preview.rows.length} 条记录</p>
      {preview.ignoredColumns.length > 0 && <Alert className="mb" type="warning" showIcon message={'以下附加列不参与导入：' + preview.ignoredColumns.join('、')} />}
      <Alert className="mb" showIcon type={preview.errors.length ? 'error' : 'success'} message={preview.errors.length ? preview.errors.length + ' 条记录校验失败，请修改文件后重新选择' : '全部记录校验通过，请核对预览和分配后确认导入'} description={preview.errors.length ? <div style={{ maxHeight: 180, overflowY: 'auto' }}>{preview.errors.map(entry => <div key={entry.line}>文件第 {entry.line} 行：{entry.errors.join('；')}</div>)}</div> : null} />
      <Table size="small" rowKey="line" dataSource={preview.entries} scroll={{ x: 200 + columns.length * 150 }} pagination={{ pageSize: 5, showSizeChanger: false, showTotal: total => '共 ' + total + ' 条' }} columns={[
        { title: '文件行号', dataIndex: 'line', width: 95, fixed: 'left' },
        { title: '校验', width: 100, fixed: 'left', render: (_, entry) => <Tag color={entry.errors.length ? 'error' : 'success'}>{entry.errors.length ? '未通过' : '通过'}</Tag> },
        ...columns.map(column => ({ title: column.title + (column.required ? '（必填）' : ''), width: 150, render: (_, entry) => <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{entry.values[column.key] || '—'}</span> })),
      ]} /></>}
  </Modal>
}
