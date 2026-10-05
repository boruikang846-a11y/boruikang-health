import React, { useEffect, useRef, useState } from 'react'
import { Alert, Button, Form, Input, Modal, Space, Spin, Steps, Table, Tag } from 'antd'
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import { newImportBatch } from './fileImport'

/** Mounted only while open; local patient data is released on close. */
export default function FileImportDialog({ title, description, columns, parseFile, createTemplate, templateName, initialValues, onClose, onSubmit, children }) {
  const [form] = Form.useForm()
  const [preview, setPreview] = useState(null), [fileName, setFileName] = useState('')
  const [reading, setReading] = useState(false), [busy, setBusy] = useState(false)
  const [downloading, setDownloading] = useState(false), [error, setError] = useState(null)
  const [step, setStep] = useState(0), [result, setResult] = useState(null)
  const sequence = useRef(0), submitting = useRef(false), batch = useRef(''), selectedFile = useRef(null)
  useEffect(() => () => { sequence.current++ }, [])
  const readFile = async file => {
    const id = ++sequence.current
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
  return <Modal className="file-import-dialog" title={title} open width={1040} maskClosable={false} closable={!busy} onCancel={() => !busy && onClose()}
    footer={<Space><Button disabled={busy} onClick={onClose}>{step === 2 ? '关闭' : '取消'}</Button>{step === 1 && <Button disabled={busy} onClick={() => { setStep(0); setError(null) }}>上一步</Button>}{step === 0 ? <Button type="primary" disabled={!preview || reading} onClick={() => setStep(1)}>下一步：校验与分配</Button> : step === 1 ? <Button type="primary" disabled={!canSubmit} loading={busy} onClick={() => form.submit()}>确认导入{preview ? '（' + preview.rows.length + ' 条）' : ''}</Button> : <Button type="primary" onClick={onClose}>完成，返回清单</Button>}</Space>}>
    <Steps className="mb" size="small" current={step} items={[{ title: '上传文件' }, { title: '校验与分配' }, { title: '导入结果' }]} />
    {step === 0 && <><Alert className="mb" type="info" showIcon message="支持 Excel（.xlsx）和 CSV，最多 500 条、5 MiB" description={description} />
      <div className="import-template"><div><h3>按模板整理名单</h3><p className="muted">电话和编号按文本填写；格式错误需修正后重新选择文件，整批校验通过才能提交。</p></div><Button icon={<DownloadOutlined />} loading={downloading} disabled={busy} onClick={download}>下载 Excel 模板</Button></div>
      <label className="import-dropzone" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); if (!busy) readFile(event.dataTransfer.files?.[0]) }}><UploadOutlined /><strong>拖拽文件到这里，或点击选择文件</strong><span>Excel（.xlsx）或 CSV · 最多 500 条 · 不超过 5 MiB</span><Input type="file" aria-label="选择导入文件" accept=".xlsx,.csv" disabled={busy || reading} onChange={event => readFile(event.target.files?.[0])} /></label>
      {preview && <Alert className="mt" type={preview.errors.length ? 'warning' : 'success'} showIcon message={fileName + ' · 已读取 ' + preview.rows.length + ' 条'} description={preview.errors.length ? '存在格式错误，请进入下一步查看文件行号与具体问题。' : '可以进入下一步核对预览并分配责任人员。'} />}</>}

    {error && <Alert className="mb" type="error" showIcon message={error} />}
    {reading && <div className="loading"><Spin /><span>正在读取并校验文件…</span></div>}
    {step === 1 && preview && <><p className="muted">{fileName}{preview.sheetName ? ' / 工作表：' + preview.sheetName : ''} · 共 {preview.rows.length} 条记录</p>
      {preview.ignoredColumns.length > 0 && <Alert className="mb" type="warning" showIcon message={'以下附加列不参与导入：' + preview.ignoredColumns.join('、')} />}
      <Alert className="mb" showIcon type={preview.errors.length ? 'error' : 'success'} message={preview.errors.length ? preview.errors.length + ' 条记录校验失败，请修改文件后重新选择' : '全部记录校验通过，请核对预览和分配后确认导入'} description={preview.errors.length ? <div style={{ maxHeight: 180, overflowY: 'auto' }}>{preview.errors.map(entry => <div key={entry.line}>文件第 {entry.line} 行：{entry.errors.join('；')}</div>)}</div> : '最终查重由服务端完成；重复记录会跳过，不覆盖已有档案。'} />
      <Table size="small" rowKey="line" dataSource={preview.entries} scroll={{ x: 200 + columns.length * 150 }} pagination={{ pageSize: 5, showSizeChanger: false, showTotal: total => '共 ' + total + ' 条' }} columns={[
        { title: '文件行号', dataIndex: 'line', width: 95, fixed: 'left' },
        { title: '校验', width: 100, fixed: 'left', render: (_, entry) => <Tag color={entry.errors.length ? 'error' : 'success'}>{entry.errors.length ? '未通过' : '通过'}</Tag> },
        ...columns.map(column => ({ title: column.title + (column.required ? '（必填）' : ''), width: 150, render: (_, entry) => <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{entry.values[column.key] || '—'}</span> })),
      ]} /></>}
    <Form form={form} layout="vertical" initialValues={initialValues} disabled={busy} onFinish={async values => {
      if (step !== 1 || !canSubmit || submitting.current) return
      submitting.current = true; setBusy(true); setError(null)
      try { const response = await onSubmit(values, preview, batch.current, selectedFile.current); setResult(response); setStep(2); setBusy(false) }
      catch (failure) { setError(failure.message); submitting.current = false; setBusy(false) }
    }} style={{ display: step === 1 ? 'block' : 'none' }}><h3>统一分配与建档设置</h3>{children}</Form>
    {step === 2 && result && <section className="import-result"><h2>导入完成</h2><div className="metric-grid"><div className="metric-box"><small>新增记录</small><div className="value">{result.created}</div></div><div className="metric-box"><small>重复跳过</small><div className="value">{result.skipped}</div></div></div><p className="muted mt">批次 {result.import_batch}。结果以服务端实际返回为准；新增记录仍需完成相应的人工判定、授权核验与服务交接。</p>{result.messages?.length > 0 && <Alert type="info" message="服务端处理说明" description={<ul>{result.messages.map((message, index) => <li key={index}>{message}</li>)}</ul>} />}</section>}
  </Modal>
}
