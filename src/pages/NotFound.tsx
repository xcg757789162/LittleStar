/**
 * 404 页面
 */

export function NotFound() {
  return (
    <div
      data-testid="not-found"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <p style={{ fontSize: '64px', marginBottom: '16px' }}>🌙</p>
      <h1 style={{ fontSize: '24px', color: '#666' }}>这颗星球还没被发现</h1>
      <p style={{ fontSize: '16px', color: '#999' }}>让我们回到星空地图吧！</p>
    </div>
  )
}
