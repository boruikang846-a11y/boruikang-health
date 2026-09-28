import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App as AntApp, ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import 'antd/dist/reset.css'
import './styles.css'
import App from './App'

createRoot(document.getElementById('root')).render(
  <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#2469d9', borderRadius: 8, fontFamily: 'Inter, "Microsoft YaHei", sans-serif' } }}>
    <AntApp><BrowserRouter><App /></BrowserRouter></AntApp>
  </ConfigProvider>,
)
