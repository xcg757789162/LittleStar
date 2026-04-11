/**
 * iframe-bridge.js — OpenMAIC iframe ↔ LittleStar 宿主层桥接脚本
 *
 * 通过 Nginx sub_filter 注入到 OpenMAIC 前端 HTML 的 <head> 尾部。
 *
 * 同源架构：前端和 OpenMAIC 通过同一 Nginx 端口服务，
 * 所有 API 请求（包括图片生成）可直接到达后端，无需拦截。
 *
 * 核心功能：
 *   - speechSynthesis.speak() 观察（通知宿主层 TTS 播放状态）
 *   - MutationObserver 检测场景切换
 *   - gen_img_* 占位符 DOM 监测和替换
 *
 * 安全策略：
 *   - 仅在 iframe（非 top 窗口）中执行
 *   - postMessage 使用具体 origin（同源架构下 parent.location.origin 可直接获取）
 *   - 图片 URL 格式校验（仅允许 http(s)、data:image、相对路径）
 */

;(function () {
  'use strict'

  // ── 环境检测：仅在 iframe 中执行 ────────────────────────
  if (window === window.top) {
    return
  }

  var LOG_PREFIX = '[iframe-bridge]'

  function log() {
    var args = Array.prototype.slice.call(arguments)
    args.unshift(LOG_PREFIX)
    console.log.apply(console, args)
  }

  function warn() {
    var args = Array.prototype.slice.call(arguments)
    args.unshift(LOG_PREFIX)
    console.warn.apply(console, args)
  }

  log('初始化桥接脚本...')

  // ── 安全常量 ──────────────────────────────────────────────
  // 同源架构：前端和 OpenMAIC 通过同一 Nginx 端口服务
  // parent.location.origin 可直接获取（不会抛 SecurityError）
  var SELF_ORIGIN = window.location.origin
  var PARENT_ORIGIN = SELF_ORIGIN
  try {
    PARENT_ORIGIN = window.parent.location.origin
  } catch (e) {
    // 非标准部署场景下可能跨域，使用 self origin
    warn('无法获取父窗口 origin，使用自身 origin:', SELF_ORIGIN)
  }

  log('SELF_ORIGIN:', SELF_ORIGIN, '| PARENT_ORIGIN:', PARENT_ORIGIN)

  // 兼容旧代码引用
  var HOST_ORIGIN = PARENT_ORIGIN

  /**
   * 校验图片 URL 格式（C3 安全修复）
   * 仅允许 http(s)、data:image、相对路径
   */
  function isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false
    return /^(https?:\/\/|data:image\/|\/)/i.test(url)
  }

  // ================================================================
  // 1. TTS 观察（不再拦截）
  //
  // **关键设计变更**：不再 Monkey Patch speechSynthesis.speak()。
  // 原生 OpenMAIC 前端有完整的 TTS 引擎（播放/暂停/控制），
  // 拦截会导致：播放按钮失效、暂停不可用、翻页后不播放、循环播放等问题。
  //
  // 新策略：
  //   - 让原生 speechSynthesis 正常工作（OpenMAIC 自己控制播放）
  //   - 仅**监听**（非拦截）TTS 调用，通知宿主层当前播放状态
  //   - 宿主层可以根据这些通知同步 UI 状态（如显示正在播放指示器）
  //   - 如果宿主层需要代理播放（原生 TTS 不可用），由宿主主动发送 host:tts-speak 指令
  // ================================================================

  var _ttsRequestCounter = 0

  /**
   * 观察 speechSynthesis.speak() 调用（不拦截）
   * 通过 wrapper 记录 TTS 事件，通知宿主层播放状态
   */
  function observeSpeechSynthesis() {
    if (typeof speechSynthesis === 'undefined') {
      warn('speechSynthesis 不可用')
      return
    }

    var _originalSpeak = speechSynthesis.speak.bind(speechSynthesis)

    speechSynthesis.speak = function (utterance) {
      // 直接调用原始 speak，让原生 OpenMAIC 正常播放
      _originalSpeak(utterance)

      // 仅通知宿主层：iframe 正在播放 TTS（供状态同步，非委托）
      if (utterance instanceof SpeechSynthesisUtterance && utterance.text) {
        var requestId = 'tts_' + (++_ttsRequestCounter)
        var text = utterance.text

        log('观察到 TTS 播放:', requestId, '文本:', text.substring(0, 50) + (text.length > 50 ? '...' : ''))

        // 通知宿主层 TTS 开始（信息通知，不需要宿主处理）
        window.parent.postMessage({
          type: 'classroom:tts-status',
          payload: {
            status: 'playing',
            text: text,
            lang: utterance.lang || undefined,
            requestId: requestId
          }
        }, HOST_ORIGIN)

        // 监听播放结束
        var origOnEnd = utterance.onend
        utterance.onend = function (event) {
          window.parent.postMessage({
            type: 'classroom:tts-status',
            payload: {
              status: 'ended',
              requestId: requestId
            }
          }, HOST_ORIGIN)
          // 调用原始 onend 回调
          if (typeof origOnEnd === 'function') {
            origOnEnd.call(utterance, event)
          }
        }

        var origOnError = utterance.onerror
        utterance.onerror = function (event) {
          window.parent.postMessage({
            type: 'classroom:tts-status',
            payload: {
              status: 'error',
              requestId: requestId,
              error: event.error
            }
          }, HOST_ORIGIN)
          // 调用原始 onerror 回调
          if (typeof origOnError === 'function') {
            origOnError.call(utterance, event)
          }
        }
      }
    }

    log('speechSynthesis.speak() 观察模式已启用（不拦截原生播放）')
  }

  /**
   * 处理宿主层的 TTS 相关响应（保留兼容性）
   */
  function handleHostTTSResponse(data) {
    // 保留处理 host:tts-done 的能力（向前兼容）
    if (data.type === 'host:tts-done' && data.payload) {
      log('收到宿主层 TTS 完成通知:', data.payload.requestId)
    }
  }

  // ================================================================
  // 2. 场景切换检测（Task 1.2）
  // MutationObserver 监听课堂 DOM 变化 + History API 拦截
  // 检测场景切换后发送 classroom:scene-change postMessage
  // 页面首次加载时发送 classroom:ready + sceneIndex=0
  // ================================================================

  var _currentSceneIndex = -1 // 尚未初始化
  var _totalScenes = 0
  var _sceneObserver = null
  var _readySent = false

  /**
   * 尝试从 DOM 中提取当前场景信息
   * OpenMAIC 课堂页面可能使用以下方式标记场景：
   * 1. [data-scene-index] 属性
   * 2. slide/scene 相关 class 名（如 .scene-active, .slide-current）
   * 3. URL hash 中的 scene 参数
   * 4. 特定容器元素的子节点变化
   */
  function detectCurrentScene() {
    var sceneIndex = 0
    var totalScenes = 1
    var sceneId = 'scene_0'

    // 策略 1: 检查 [data-scene-index] 属性
    var sceneEl = document.querySelector('[data-scene-index]')
    if (sceneEl) {
      var idx = parseInt(sceneEl.getAttribute('data-scene-index'), 10)
      if (!isNaN(idx)) {
        sceneIndex = idx
      }
      var total = sceneEl.getAttribute('data-total-scenes')
      if (total) {
        var t = parseInt(total, 10)
        if (!isNaN(t)) totalScenes = t
      }
      sceneId = sceneEl.getAttribute('data-scene-id') || ('scene_' + sceneIndex)
      return { sceneId: sceneId, sceneIndex: sceneIndex, totalScenes: totalScenes }
    }

    // 策略 2: 检查带有 scene/slide 相关 class 的活动元素
    var activeSlide = document.querySelector('.scene-active, .slide-active, .slide-current, [class*="activeScene"], [class*="currentSlide"]')
    if (activeSlide) {
      // 尝试从兄弟元素中推算 index
      var parent = activeSlide.parentElement
      if (parent) {
        var siblings = parent.children
        for (var i = 0; i < siblings.length; i++) {
          if (siblings[i] === activeSlide) {
            sceneIndex = i
            break
          }
        }
        totalScenes = siblings.length
      }
      sceneId = activeSlide.getAttribute('data-scene-id') || activeSlide.id || ('scene_' + sceneIndex)
      return { sceneId: sceneId, sceneIndex: sceneIndex, totalScenes: totalScenes }
    }

    // 策略 3: 从 URL hash 提取 scene 信息
    var hash = window.location.hash
    if (hash) {
      var match = hash.match(/scene[=_-]?(\d+)/i)
      if (match) {
        sceneIndex = parseInt(match[1], 10)
        sceneId = 'scene_' + sceneIndex
      }
    }

    return { sceneId: sceneId, sceneIndex: sceneIndex, totalScenes: totalScenes }
  }

  /**
   * 发送场景切换事件给宿主层
   */
  function notifySceneChange(sceneInfo) {
    if (sceneInfo.sceneIndex === _currentSceneIndex) return // 无变化

    _currentSceneIndex = sceneInfo.sceneIndex
    _totalScenes = sceneInfo.totalScenes

    // 场景切换时清理旧的 gen_img DOM 引用，防止内存泄漏（I4 修复）
    _genImgElements = {}

    log('场景切换:', sceneInfo.sceneId, '(' + sceneInfo.sceneIndex + '/' + sceneInfo.totalScenes + ')')

    window.parent.postMessage({
      type: 'classroom:scene-change',
      payload: {
        sceneId: sceneInfo.sceneId,
        sceneIndex: sceneInfo.sceneIndex,
        totalScenes: sceneInfo.totalScenes
      }
    }, HOST_ORIGIN)
  }

  /**
   * 发送 classroom:ready 信号
   */
  function notifyReady() {
    if (_readySent) return
    _readySent = true

    var sceneInfo = detectCurrentScene()
    _currentSceneIndex = sceneInfo.sceneIndex
    _totalScenes = sceneInfo.totalScenes

    log('发送 classroom:ready')

    window.parent.postMessage({
      type: 'classroom:ready',
      payload: null
    }, HOST_ORIGIN)

    // 同时发送首个场景变化
    window.parent.postMessage({
      type: 'classroom:scene-change',
      payload: {
        sceneId: sceneInfo.sceneId,
        sceneIndex: sceneInfo.sceneIndex,
        totalScenes: sceneInfo.totalScenes
      }
    }, HOST_ORIGIN)
  }

  /**
   * 启动 MutationObserver 监听 DOM 变化
   */
  function startSceneObserver() {
    if (!window.MutationObserver) {
      warn('MutationObserver 不可用，无法监听场景切换')
      return
    }

    // 防抖：DOM 变化频繁时不会每次都发送事件
    var debounceTimer = null
    var DEBOUNCE_MS = 300

    _sceneObserver = new MutationObserver(function () {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(function () {
        var sceneInfo = detectCurrentScene()
        notifySceneChange(sceneInfo)
      }, DEBOUNCE_MS)
    })

    // 监听 body 子树变化（childList + subtree 覆盖场景切换时的 DOM 增删）
    _sceneObserver.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-scene-index', 'class']
    })

    log('MutationObserver 已启动（场景切换检测）')
  }

  /**
   * 监听 History API 变化（SPA 路由切换）
   */
  function watchHistoryChanges() {
    // Monkey Patch pushState / replaceState
    var _originalPushState = history.pushState
    var _originalReplaceState = history.replaceState

    history.pushState = function () {
      _originalPushState.apply(history, arguments)
      onRouteChange()
    }

    history.replaceState = function () {
      _originalReplaceState.apply(history, arguments)
      onRouteChange()
    }

    window.addEventListener('popstate', onRouteChange)
    window.addEventListener('hashchange', onRouteChange)

    function onRouteChange() {
      // 延迟检测，等待 React 渲染完成
      setTimeout(function () {
        var sceneInfo = detectCurrentScene()
        notifySceneChange(sceneInfo)
      }, 200)
    }

    log('History API 监听已启动')
  }

  /**
   * 等待 DOM 就绪后初始化场景检测
   */
  function initSceneDetection() {
    function doInit() {
      startSceneObserver()
      watchHistoryChanges()
      // 延迟发送 ready（等待 OpenMAIC 前端完成初始渲染）
      setTimeout(notifyReady, 1000)
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', doInit)
    } else {
      // DOM 已就绪（脚本可能在 DOMContentLoaded 之后执行）
      doInit()
    }
  }

  // ================================================================
  // 3. 图片生成 — 同源架构说明
  //
  // 同源架构下，OpenMAIC 前端的 fetch(/api/generate-image) 请求
  // 会直接通过 Nginx 路由到后端，无需 iframe-bridge 拦截。
  // 旧的 fetch Monkey Patch 已移除。
  //
  // 仅保留 handleHostImageResult 用于处理 gen_img 占位符的
  // 宿主层图片结果回传（通过 postMessage）。
  // ================================================================

  var IMAGE_TIMEOUT_MS = 30000 // 图片生成超时时间
  var _imagePending = {}
  var _imageRequestCounter = 0

  /**
   * 处理宿主层回传的图片生成结果
   */
  function handleHostImageResult(data) {
    if (data.type === 'host:image-result' && data.payload) {
      var requestId = data.payload.requestId
      if (requestId && _imagePending[requestId]) {
        var pending = _imagePending[requestId]
        clearTimeout(pending.timer)
        delete _imagePending[requestId]

        if (data.payload.success) {
          log('图片生成成功:', requestId)
          if (pending.isGenImg && pending.genImgId) {
            var imageUrl = data.payload.imageUrl || data.payload.base64
            if (imageUrl) {
              updateGenImgDOM(pending.genImgId, imageUrl)
            } else {
              showGenImgFallback(pending.genImgId)
            }
          }
        } else {
          log('图片生成失败:', requestId, data.payload.error)
          if (pending.isGenImg && pending.genImgId) {
            showGenImgFallback(pending.genImgId)
          }
        }
      }
    }
  }

  // ================================================================
  // 4. gen_img 占位符 DOM 监测（Task 1.4）
  // MutationObserver 检测 gen_img_* 占位符图片
  // 替换为"生成中"占位 UI 并触发图片生成请求
  // 缓存已发请求防重复
  // ================================================================

  // 已发送过请求的 gen_img ID 集合（防止重复发送）
  var _genImgRequested = {}
  // gen_img 请求 ID → DOM 元素映射（用于回传时更新 DOM）
  var _genImgElements = {}
  var _genImgObserver = null

  /**
   * 检测 gen_img_* 占位符并处理
   * OpenMAIC 后端生成的课堂 JSON 中，AI 图片位置使用 gen_img_XXXX 格式的占位符 ID
   * 前端渲染时，这些 ID 可能出现在 <img> 的 src/alt 或其他元素的文本中
   */
  function scanForGenImgPlaceholders() {
    // 策略 1: 检查 <img> 元素的 src 包含 gen_img
    var images = document.querySelectorAll('img')
    for (var i = 0; i < images.length; i++) {
      var img = images[i]
      var src = img.getAttribute('src') || ''
      var alt = img.getAttribute('alt') || ''

      // 匹配 gen_img_XXXX 模式
      var match = src.match(/gen_img_(\w+)/) || alt.match(/gen_img_(\w+)/)
      if (match) {
        var genImgId = 'gen_img_' + match[1]
        processGenImgElement(img, genImgId)
      }
    }

    // 策略 2: 检查文本节点中的 gen_img 占位符
    var walker = document.createTreeWalker(
      document.body || document.documentElement,
      NodeFilter.SHOW_TEXT,
      null,
      false
    )
    var node
    while ((node = walker.nextNode())) {
      var text = node.textContent || ''
      if (text.indexOf('gen_img_') !== -1) {
        // 找到包含 gen_img 的文本节点，尝试替换为占位 UI
        var matches = text.match(/gen_img_\w+/g)
        if (matches) {
          for (var j = 0; j < matches.length; j++) {
            requestGenImgGeneration(matches[j])
          }
        }
      }
    }
  }

  /**
   * 处理单个 gen_img 占位符元素
   * 替换为"生成中"占位 UI，并触发图片生成请求
   */
  function processGenImgElement(imgEl, genImgId) {
    if (_genImgRequested[genImgId]) {
      // 已经请求过，但可能需要更新元素引用
      if (!_genImgElements[genImgId]) {
        _genImgElements[genImgId] = []
      }
      if (_genImgElements[genImgId].indexOf(imgEl) === -1) {
        _genImgElements[genImgId].push(imgEl)
      }
      return
    }

    // 替换为占位 UI
    showPlaceholderUI(imgEl)

    // 记录元素引用
    _genImgElements[genImgId] = [imgEl]

    // 触发图片生成请求
    requestGenImgGeneration(genImgId)
  }

  /**
   * 为 <img> 元素显示"生成中"占位 UI
   */
  function showPlaceholderUI(imgEl) {
    // 设置占位样式
    imgEl.style.background = 'linear-gradient(135deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)'
    imgEl.style.backgroundSize = '200% 100%'
    imgEl.style.animation = 'shimmer 1.5s infinite linear'
    imgEl.style.minWidth = '200px'
    imgEl.style.minHeight = '150px'
    imgEl.style.borderRadius = '12px'
    imgEl.style.display = 'block'

    // 设置 alt 文本为加载提示
    imgEl.alt = '🎨 图片生成中...'

    // 清空 src 避免 404 错误
    imgEl.removeAttribute('src')

    // 注入 shimmer 动画（如果还未注入）
    if (!document.getElementById('iframe-bridge-styles')) {
      var style = document.createElement('style')
      style.id = 'iframe-bridge-styles'
      style.textContent = '@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }'
      document.head.appendChild(style)
    }
  }

  /**
   * 向宿主层请求生成指定 gen_img_* 的图片
   */
  function requestGenImgGeneration(genImgId) {
    if (_genImgRequested[genImgId]) return // 防重复

    _genImgRequested[genImgId] = true

    var requestId = 'genimg_' + (++_imageRequestCounter)

    log('检测到 gen_img 占位符:', genImgId, '→ 请求宿主层生成图片:', requestId)

    window.parent.postMessage({
      type: 'classroom:image-request',
      payload: {
        requestId: requestId,
        genImgId: genImgId,
        url: '/api/generate-image',
        prompt: genImgId, // 宿主层可根据课堂数据查找实际 prompt
        isGenImgPlaceholder: true
      }
    }, HOST_ORIGIN)

    // gen_img 的图片结果由同一个 handleHostImageResult 处理
    // 在 _imagePending 中记录，以便结果回传时更新 DOM
    var timer = setTimeout(function () {
      if (_imagePending[requestId]) {
        warn('gen_img 生成超时:', genImgId)
        delete _imagePending[requestId]
        // 超时后显示兜底文本
        showGenImgFallback(genImgId)
      }
    }, IMAGE_TIMEOUT_MS)

    _imagePending[requestId] = {
      resolve: function (response) {
        // gen_img 结果不是给 fetch 调用方的，直接更新 DOM
        response.json().then(function (data) {
          if (data.url || data.base64) {
            updateGenImgDOM(genImgId, data.url || data.base64)
          } else {
            showGenImgFallback(genImgId)
          }
        }).catch(function () {
          showGenImgFallback(genImgId)
        })
      },
      reject: function () {
        showGenImgFallback(genImgId)
      },
      timer: timer,
      isGenImg: true,
      genImgId: genImgId
    }
  }

  /**
   * 更新 gen_img 占位符的 DOM 为实际图片
   */
  function updateGenImgDOM(genImgId, imageUrl) {
    var elements = _genImgElements[genImgId]
    if (!elements || elements.length === 0) return

    // 安全校验：仅允许合法图片 URL（C3 修复）
    if (!isValidImageUrl(imageUrl)) {
      warn('图片 URL 格式非法，已拒绝:', imageUrl)
      showGenImgFallback(genImgId)
      return
    }

    log('更新 gen_img DOM:', genImgId, '→', imageUrl.substring(0, 50))

    for (var i = 0; i < elements.length; i++) {
      var el = elements[i]
      if (el.tagName === 'IMG') {
        el.style.background = 'none'
        el.style.animation = 'none'
        el.src = imageUrl
        el.alt = '教学插图'
      }
    }
  }

  /**
   * gen_img 生成失败/超时时显示兜底内容
   */
  function showGenImgFallback(genImgId) {
    var elements = _genImgElements[genImgId]
    if (!elements || elements.length === 0) return

    for (var i = 0; i < elements.length; i++) {
      var el = elements[i]
      el.style.background = '#f5f5f5'
      el.style.animation = 'none'
      el.alt = '📷 图片暂不可用'
      el.style.display = 'flex'
      el.style.alignItems = 'center'
      el.style.justifyContent = 'center'
      el.style.fontSize = '14px'
      el.style.color = '#999'
    }
  }

  /**
   * 启动 gen_img 占位符 DOM 监测
   */
  function initGenImgObserver() {
    if (!window.MutationObserver) {
      warn('MutationObserver 不可用，无法监测 gen_img 占位符')
      return
    }

    // 初始扫描
    function doInitScan() {
      // 延迟扫描，确保初始渲染完成
      setTimeout(scanForGenImgPlaceholders, 2000)
    }

    // 持续监测新增的 gen_img 占位符
    var scanDebounce = null
    _genImgObserver = new MutationObserver(function (mutations) {
      // 快速检查：是否有新增的 img 元素或文本变化
      var hasRelevantChange = false
      for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes.length > 0) {
          hasRelevantChange = true
          break
        }
      }
      if (!hasRelevantChange) return

      if (scanDebounce) clearTimeout(scanDebounce)
      scanDebounce = setTimeout(scanForGenImgPlaceholders, 500)
    })

    function startObserving() {
      _genImgObserver.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
      })
      log('gen_img 占位符 MutationObserver 已启动')
      doInitScan()
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startObserving)
    } else {
      startObserving()
    }
  }

  // ================================================================
  // 消息监听器：处理宿主层发来的响应
  // ================================================================

  window.addEventListener('message', function (event) {
    // 安全校验：同源架构下只接受来自父窗口 origin 的消息
    if (event.origin !== PARENT_ORIGIN && event.origin !== SELF_ORIGIN) {
      return
    }

    var data = event.data
    if (!data || typeof data.type !== 'string') return

    // 只处理 host: 前缀的消息（来自宿主层）
    if (!data.type.startsWith('host:')) return

    switch (data.type) {
      case 'host:tts-done':
        handleHostTTSResponse(data)
        break
      case 'host:image-result':
        handleHostImageResult(data)
        break
      case 'host:mute-internal':
        log('收到宿主层静默指令，后续 TTS 将由宿主层接管')
        break
    }
  })

  // ================================================================
  // 初始化
  // ================================================================

  // 1. TTS 观察（不拦截原生播放）
  observeSpeechSynthesis()

  // 2. 场景切换检测
  initSceneDetection()

  // 3. gen_img 占位符监测
  initGenImgObserver()

  log('桥接脚本初始化完成')
})()
