/**
 * 知识点掌握趋势折线图
 */

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { KnowledgeMasteryTrend } from '@/types/models'

interface MasteryTrendChartProps {
  data: KnowledgeMasteryTrend[]
}

export function MasteryTrendChart({ data }: MasteryTrendChartProps) {
  const chartData = data.map((item) => ({
    name: item.nodeName,
    开始: item.startLevel,
    结束: item.endLevel,
  }))

  return (
    <div data-testid="mastery-trend-chart" style={{ width: '100%', height: 200 }}>
      {chartData.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#999', paddingTop: '80px' }}>暂无趋势数据</p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Line type="monotone" dataKey="开始" stroke="#FF9800" strokeWidth={2} />
            <Line type="monotone" dataKey="结束" stroke="#4CAF50" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
