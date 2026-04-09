/**
 * 孩子切换选择器
 * 展示当前用户的所有孩子，支持切换和添加新孩子
 */

import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useChildStore } from '@/stores/childStore'
import type { Child } from '@/types/models'

interface ChildSwitcherProps {
  /** 是否显示 */
  visible: boolean
  /** 关闭回调 */
  onClose: () => void
}

export function ChildSwitcher({ visible, onClose }: ChildSwitcherProps) {
  const navigate = useNavigate()
  const { children, currentChild, setCurrentChild } = useChildStore()

  if (!visible) return null

  const handleSelect = (child: Child) => {
    setCurrentChild(child)
    onClose()
  }

  const handleAddChild = () => {
    onClose()
    navigate('/create-child')
  }

  return (
    <div
      data-testid="child-switcher-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        zIndex: 9999,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: 'white',
          borderRadius: '24px 24px 0 0',
          padding: '24px',
          maxHeight: '60vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', margin: 0 }}>
            切换孩子
          </h3>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: '#F5F5F5',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* 孩子列表 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          {children.map((child) => {
            const isActive = currentChild?.id === child.id
            return (
              <button
                key={child.id}
                onClick={() => handleSelect(child)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 16px',
                  borderRadius: '16px',
                  border: isActive ? '2px solid #7C4DFF' : '2px solid #F0F0F0',
                  backgroundColor: isActive ? '#EDE7F6' : 'white',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '32px' }}>{child.avatar}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#333', margin: 0 }}>
                    {child.name}
                  </p>
                  <p style={{ fontSize: '13px', color: '#999', margin: '2px 0 0' }}>
                    {child.age}岁
                  </p>
                </div>
                {isActive && (
                  <span style={{ fontSize: '14px', color: '#7C4DFF', fontWeight: 'bold' }}>
                    当前 ✓
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* 添加新孩子按钮 */}
        <button
          data-testid="add-child-btn"
          onClick={handleAddChild}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '16px',
            border: '2px dashed #BDBDBD',
            backgroundColor: '#FAFAFA',
            color: '#999',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '20px' }}>➕</span>
          添加新孩子
        </button>
      </motion.div>
    </div>
  )
}
