import React from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import 'antd/dist/reset.css'
import './styles.css'
import App from './App'

createRoot(document.getElementById('root')).render(
  <ConfigProvider theme={{ token: { colorPrimary: '#168578', borderRadius: 14, fontFamily: 'Inter, "Microsoft YaHei", sans-serif' } }}>
    <App />
  </ConfigProvider>,
)
