import React, { useState } from 'react'
import { Alert, Button, Card, DatePicker, Descriptions, Form, Input, Modal, Space, Tag } from 'antd'
import dayjs from 'dayjs'
import { api, useLoad } from '../api'
import { DataTable, dateText, FormDialog, required } from '../ui'

export default function ReportArchives({ query }) {
  const [page, setPage] = useState(0)
  const [create, setCreate] = useState(null)
  const [detail, setDetail] = useState(null)
  const [delivery, setDelivery] = useState(null)
  const state = useLoad(() => api('/reports/archives/query', { page, size: 10 }), [page])
  return <Card className="mt no-print" title="日归档与周复盘" extra={<Space><Button onClick={() => setCreate('DAILY')}>记录日归档</Button><Button type="primary" onClick={() => setCreate('WEEKLY')}>记录周复盘</Button></Space>}>
    <p className="muted">归档时保存统计快照和改进计划。报告可人工打印、传递；外发后登记凭证，系统不会自动发信。</p>
    <DataTable state={state} page={page} setPage={setPage} columns={[
      { title: '类型', dataIndex: 'report_type', render: v => v === 'DAILY' ? '日归档' : '周复盘' },
      { title: '统计区间', render: (_,r) => r.from_date + ' 至 ' + r.to_date },
      { title: '业务总结', dataIndex: 'summary', ellipsis: true },
      { title: '外发记录', render: (_,r) => <Tag color={r.delivered_at ? 'green' : 'default'}>{r.delivered_at ? '已登记人工外发凭证' : '未登记外发'}</Tag> },
      { title: '操作', render: (_,r) => <Space><Button type="link" onClick={() => setDetail(r)}>查看快照</Button>{!r.delivered_at && <Button type="link" onClick={() => setDelivery(r)}>登记外发凭证</Button>}</Space> },
    ]} />
    <FormDialog title={create === 'DAILY' ? '记录日归档' : '记录周复盘'} open={Boolean(create)} onClose={() => setCreate(null)} initialValues={{ range: create === 'DAILY' ? [dayjs(),dayjs()] : [dayjs(query.from_date),dayjs(query.to_date)] }} onSubmit={async v => {
      await api('/reports/archive', { report_type: create, from_date:v.range[0].format('YYYY-MM-DD'), to_date:v.range[1].format('YYYY-MM-DD'), summary:v.summary, action_plan:v.action_plan }); state.reload()
    }}>
      <Form.Item name="range" label={create === 'DAILY' ? '归档日期（起止选同一天）' : '复盘区间（最多七天）'} rules={required}><DatePicker.RangePicker allowClear={false} /></Form.Item>
      <Form.Item name="summary" label="本期完成情况与问题" rules={required}><Input.TextArea rows={4} maxLength={2000} placeholder="核对未接通、逾期、异常升级和复诊核实情况。" /></Form.Item>
      <Form.Item name="action_plan" label="下一步安排与责任人" rules={required}><Input.TextArea rows={4} maxLength={2000} /></Form.Item>
      <Alert type="info" message="保存当前可见范围的真实统计快照，归档后不随任务后续变化而改写。" />
    </FormDialog>
    <FormDialog title="登记已实际完成的人工外发" open={Boolean(delivery)} initialValues={{ delivered_at:dayjs() }} onClose={() => setDelivery(null)} onSubmit={async v => {
      await api('/reports/delivery', { id:delivery.id, version:delivery.version, evidence:v.evidence, delivered_at:v.delivered_at.format('YYYY-MM-DDTHH:mm:ss') }); state.reload()
    }}>
      <Alert className="mb" type="warning" message="本按钮不会发送报告。请仅在已人工交付后填写。" />
      <Form.Item name="delivered_at" label="实际外发时间" rules={required}><DatePicker showTime /></Form.Item>
      <Form.Item name="evidence" label="接收人、渠道与交付凭证" rules={required}><Input.TextArea rows={4} maxLength={1000} placeholder="记录实际接收人、渠道、消息或交接编号及核验情况。" /></Form.Item>
    </FormDialog>
    <Modal title="运营归档快照" open={Boolean(detail)} width={750} onCancel={() => setDetail(null)} footer={<Button onClick={() => setDetail(null)}>关闭</Button>}>
      {detail && <><Descriptions column={2} items={[
        { key:'range', label:'统计区间', children:detail.from_date + ' 至 ' + detail.to_date }, { key:'time', label:'归档时间', children:dateText(detail.created_at) },
        { key:'due', label:'应随访', children:detail.snapshot.due_count + ' 项' }, { key:'done', label:'已完成', children:detail.snapshot.completed_count + ' 项' },
        { key:'rate', label:'随访完成率', children:detail.snapshot.completion_rate == null ? '--' : detail.snapshot.completion_rate + '%' },
        { key:'contact', label:'当时待再次联系', children:detail.snapshot.contact_pending_count + ' 项' },
      ]} /><h3>业务总结</h3><p className="pre-wrap">{detail.summary}</p><h3>下一步安排</h3><p className="pre-wrap">{detail.action_plan}</p><h3>人工外发记录</h3><p>{detail.delivery_evidence || '尚未登记人工外发凭证'}</p>{detail.delivered_at && <small>{dateText(detail.delivered_at)}</small>}</>}
    </Modal>
  </Card>
}
