import React from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import 'antd/dist/reset.css'
import './styles.css'
import App from './App'

createRoot(document.getElementById('root')).render(
  <ConfigProvider theme={{ token: { colorPrimary: '#17907f', colorText: '#1f3a33', borderRadius: 16, borderRadiusLG: 22,
    fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, "PingFang SC", "Microsoft YaHei", sans-serif' } }}>
    <App />
  </ConfigProvider>,
)
