import { getAccessToken } from '@/utils/auth'

// WebSocket消息类型定义
export interface WebSocketMessage {
  type: string
  content: any
}

// 温控设备状态消息
export interface TempDeviceStatusMessage {
  deviceId: number
  deviceName: string
  deviceSn: string
  statusType: 'ONLINE' | 'OFFLINE' | 'ACTIVATED' | 'DEACTIVATED'
  activeStatus: number
  onlineStatus: number
  changeTime: number
  tenantId: number
  warehouseId?: number
  lastSeen?: number
}

// WebSocket事件回调类型
export interface WebSocketCallbacks {
  onOpen?: () => void
  onClose?: () => void
  onError?: (error: Event) => void
  onTempDeviceStatus?: (message: TempDeviceStatusMessage) => void
}

// WebSocket连接状态
export enum WebSocketStatus {
  CONNECTING = 'CONNECTING',
  OPEN = 'OPEN',
  CLOSING = 'CLOSING',
  CLOSED = 'CLOSED'
}

/**
 * 温控设备WebSocket管理类
 */
export class TempDeviceWebSocketManager {
  private websocket: WebSocket | null = null
  private callbacks: WebSocketCallbacks = {}
  private reconnectTimer: NodeJS.Timeout | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 5000
  private status: WebSocketStatus = WebSocketStatus.CLOSED

  constructor(callbacks?: WebSocketCallbacks) {
    this.callbacks = callbacks || {}
  }

  /**
   * 连接WebSocket
   */
  connect(): void {
    try {
      const token = getAccessToken()
      if (!token) {
        console.warn('未获取到访问令牌，无法建立WebSocket连接')
        return
      }

      const wsUrl = `ws://localhost:58080/system/ws?token=${token}`
      this.websocket = new WebSocket(wsUrl)
      this.status = WebSocketStatus.CONNECTING

      this.websocket.onopen = this.handleOpen.bind(this)
      this.websocket.onmessage = this.handleMessage.bind(this)
      this.websocket.onclose = this.handleClose.bind(this)
      this.websocket.onerror = this.handleError.bind(this)
    } catch (error) {
      console.error('创建WebSocket连接失败:', error)
      this.status = WebSocketStatus.CLOSED
    }
  }

  /**
   * 断开WebSocket连接
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.websocket) {
      this.status = WebSocketStatus.CLOSING
      this.websocket.close()
      this.websocket = null
    }
    this.status = WebSocketStatus.CLOSED
  }

  /**
   * 获取连接状态
   */
  getStatus(): WebSocketStatus {
    return this.status
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.status === WebSocketStatus.OPEN
  }

  /**
   * 设置回调函数
   */
  setCallbacks(callbacks: WebSocketCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }

  /**
   * 发送消息
   */
  send(message: any): void {
    if (this.websocket && this.status === WebSocketStatus.OPEN) {
      this.websocket.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket未连接，无法发送消息')
    }
  }

  /**
   * 处理连接打开
   */
  private handleOpen(): void {

    this.status = WebSocketStatus.OPEN
    this.reconnectAttempts = 0
    // 移除直接的 ElMessage 调用，让组件来处理消息提示
    this.callbacks.onOpen?.()
  }

  /**
   * 处理消息接收
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data: WebSocketMessage = JSON.parse(event.data)
      this.processMessage(data)
    } catch (error) {
      console.error('解析WebSocket消息失败:', error)
    }
  }

  /**
   * 处理连接关闭
   */
  private handleClose(): void {

    this.status = WebSocketStatus.CLOSED
    this.callbacks.onClose?.()
    this.attemptReconnect()
  }

  /**
   * 处理连接错误
   */
  private handleError(error: Event): void {
    console.error('WebSocket 连接错误:', error)
    this.status = WebSocketStatus.CLOSED
    this.callbacks.onError?.(error)
  }

  /**
   * 处理具体消息类型
   */
  private processMessage(data: WebSocketMessage): void {
    switch (data.type) {
      case 'temp_device_status':
        this.handleTempDeviceStatus(data.content)
        break
      default:
        console.warn('未知的消息类型:', data.type)
    }
  }

  /**
   * 处理温控设备状态消息
   */
  private handleTempDeviceStatus(deviceStatus: TempDeviceStatusMessage): void {


    // 调用回调函数，由Vue组件处理消息提示
    this.callbacks.onTempDeviceStatus?.(deviceStatus)
  }

  /**
   * 尝试重连
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('WebSocket重连次数已达上限，停止重连')
      return
    }

    this.reconnectAttempts++


    this.reconnectTimer = setTimeout(() => {
      if (this.status === WebSocketStatus.CLOSED) {
        this.connect()
      }
    }, this.reconnectInterval)
  }
}

// 创建单例实例
export const tempDeviceWebSocket = new TempDeviceWebSocketManager()