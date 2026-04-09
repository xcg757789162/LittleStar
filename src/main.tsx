import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { db } from './db/database'
import { seedDatabase } from './data/seed'
import './styles/global.css'

// 应用启动时初始化种子数据（幂等：已有数据则跳过）
seedDatabase(db).catch((err) => {
  console.error('Failed to seed database:', err)
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
