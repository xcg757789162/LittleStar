/**
 * 家长设置管理
 * 每日学习时长、科目偏好、难度调整、孩子信息管理
 */

export function ParentSettings() {
  return (
    <div
      data-testid="parent-settings"
      style={{
        padding: '24px',
        maxWidth: '600px',
        margin: '0 auto',
      }}
    >
      <h1 style={{ fontSize: '24px', color: '#333', marginBottom: '24px' }}>设置</h1>

      {/* 孩子信息 */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', color: '#555', marginBottom: '12px' }}>孩子信息</h2>
        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: '#F5F5F5',
          }}
        >
          <p>名字：小明</p>
          <p>年龄：5岁</p>
        </div>
      </section>

      {/* 学习时长 */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', color: '#555', marginBottom: '12px' }}>每日学习时长</h2>
        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: '#E3F2FD',
          }}
        >
          <p>当前设置：30 分钟/天</p>
        </div>
      </section>

      {/* 科目偏好 */}
      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', color: '#555', marginBottom: '12px' }}>科目偏好</h2>
        <div
          style={{
            display: 'flex',
            gap: '8px',
          }}
        >
          {['数学', '语文', '英语'].map((s) => (
            <span
              key={s}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                backgroundColor: '#E8F5E9',
                fontSize: '14px',
              }}
            >
              {s}
            </span>
          ))}
        </div>
      </section>
    </div>
  )
}
