import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App as AntApp, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import 'antd/dist/reset.css'
import './styles.css'
import App from './App'

createRoot(document.getElementById('root')).render(
  <ConfigProvider locale={zhCN} theme={{
    token: { colorPrimary: '#299e60', colorInfo: '#299e60', colorText: '#1f2f47', colorTextSecondary: '#4b5d78', borderRadius: 6, borderRadiusLG: 8,
      colorBgContainer: 'rgba(255,255,255,0.55)', colorBgElevated: 'rgba(255,255,255,0.88)', colorBgLayout: 'transparent', colorBorderSecondary: 'rgba(255,255,255,0.7)',
      fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, "PingFang SC", "Microsoft YaHei", sans-serif' },
    components: { Layout: { bodyBg: 'transparent', siderBg: 'transparent', headerBg: 'transparent', triggerBg: 'transparent', triggerColor: '#4b5d78' },
      Menu: { itemBg: 'transparent', subMenuItemBg: 'transparent', itemSelectedBg: 'rgba(47,111,237,0.14)', itemSelectedColor: '#1f55c8', itemHoverBg: 'rgba(255,255,255,0.6)', itemHoverColor: '#1f55c8', itemBorderRadius: 14, itemHeight: 44, itemMarginInline: 0, itemMarginBlock: 6, activeBarBorderWidth: 0 },
      Card: { headerBg: 'transparent' }, Table: { headerBg: 'transparent', rowHoverBg: 'rgba(255,255,255,0.55)' } },
  }}>
    <AntApp><BrowserRouter><App /></BrowserRouter></AntApp>
  </ConfigProvider>,
)
