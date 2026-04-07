/**
 * 学习时长柱状图
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface LearningTimeChartProps {
  data: number[]
}

const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export function LearningTimeChart({ data }: LearningTimeChartProps) {
  const chartData = data.map((minutes, i) => ({
    day: DAY_LABELS[i % 7] || `第${i + 1}天`,
    minutes,
  }))

  return (
    <div data-testid="learning-time-chart" style={{ width: '100%', height: 200 }}>
      {chartData.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#999', paddingTop: '80px' }}>暂无学习数据</p>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip formatter={(value) => [`${value} 分钟`, '学习时长']} />
            <Bar dataKey="minutes" fill="#4CAF50" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
