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
    token: { colorPrimary: '#299e60', colorInfo: '#299e60', colorText: '#26343c', colorTextSecondary: '#647580', borderRadius: 4, borderRadiusLG: 5,
      colorBgContainer: '#ffffff', colorBgElevated: '#ffffff', colorBgLayout: '#f1f5f5', colorBorder: '#dce5e1', colorBorderSecondary: '#e7edeb',
      fontFamily: '"PingFang SC", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, sans-serif' },
    components: { Layout: { bodyBg: '#f1f5f5', siderBg: '#26303f', headerBg: '#1d2632', triggerBg: '#334256', triggerColor: '#ffffff' },
      Menu: { itemBg: 'transparent', subMenuItemBg: 'transparent', itemColor: '#c7d0da', itemSelectedBg: '#299e60', itemSelectedColor: '#ffffff', itemHoverBg: '#334256', itemHoverColor: '#ffffff', itemBorderRadius: 3, itemHeight: 42, itemMarginInline: 0, itemMarginBlock: 4, activeBarBorderWidth: 0 },
      Card: { headerBg: '#ffffff', headerHeight: 50 }, Table: { headerBg: '#f4f7f6', rowHoverBg: '#f0f9f3' } },
  }}>
    <AntApp><BrowserRouter><App /></BrowserRouter></AntApp>
  </ConfigProvider>,
)
