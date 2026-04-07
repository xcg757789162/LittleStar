/**
 * 家长仪表盘
 * 学习时长、完成量、正确率概览
 */

export function ParentDashboard() {
  return (
    <div
      data-testid="parent-dashboard"
      style={{
        padding: '24px',
        maxWidth: '600px',
        margin: '0 auto',
      }}
    >
      <h1 style={{ fontSize: '24px', color: '#333', marginBottom: '24px' }}>学习概览</h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          data-testid="stat-duration"
          style={{
            padding: '20px',
            borderRadius: '16px',
            backgroundColor: '#E3F2FD',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#1565C0' }}>0分</p>
          <p style={{ fontSize: '14px', color: '#666' }}>今日学习</p>
        </div>
        <div
          data-testid="stat-completed"
          style={{
            padding: '20px',
            borderRadius: '16px',
            backgroundColor: '#E8F5E9',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#2E7D32' }}>0题</p>
          <p style={{ fontSize: '14px', color: '#666' }}>完成题数</p>
        </div>
        <div
          data-testid="stat-accuracy"
          style={{
            padding: '20px',
            borderRadius: '16px',
            backgroundColor: '#FFF3E0',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#E65100' }}>0%</p>
          <p style={{ fontSize: '14px', color: '#666' }}>正确率</p>
        </div>
      </div>
    </div>
  )
}
