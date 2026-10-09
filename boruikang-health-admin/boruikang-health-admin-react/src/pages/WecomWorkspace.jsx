import React from 'react'
import { Tabs } from 'antd'
import { useSearchParams } from 'react-router-dom'
import WechatChannel from './Wechat'
import ServiceCenter from './ServiceCenter'
export default function WecomWorkspace() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'service' ? 'service' : 'contacts'
  return <><Tabs activeKey={tab} onChange={value => setParams({ tab: value })} items={[{ key: 'contacts', label: '联系人与沟通' }, { key: 'service', label: '受邀登记与服务' }]} />{tab === 'service' ? <ServiceCenter /> : <WechatChannel provider="WE_COM" />}</>
}
