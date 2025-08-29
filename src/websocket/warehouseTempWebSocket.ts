import { getAccessToken } from '@/utils/auth'

/**
 * WebSocket消息类型定义
 * 
 * 定义了WebSocket通信的标准消息结构：
 * - type: 消息类型，用于后端消息路由和前端消息分发
 * - content: 消息内容，包含具体的业务数据
 */
export interface WebSocketMessage {
  type: string
  content: any
}

/**
 * 订阅消息接口
 * 
 * 用于向后端发送仓库温控数据订阅请求：
 * - type: 固定为'subscribe'，标识这是订阅操作
 * - warehouseIds: 要订阅的仓库ID数组，支持批量订阅
 */
export interface SubscribeMessage {
  type: 'subscribe'
  warehouseIds: number[]
}

/**
 * 取消订阅消息接口
 * 
 * 用于向后端发送取消仓库温控数据订阅请求：
 * - type: 固定为'unsubscribe'，标识这是取消订阅操作
 * - warehouseIds: 要取消订阅的仓库ID数组，支持批量取消
 */
export interface UnsubscribeMessage {
  type: 'unsubscribe'
  warehouseIds: number[]
}

/**
 * 温控数据消息接口（匹配后端WarehouseTempDataMessage格式）
 * 
 * 定义了从后端推送的温控数据的完整格式：
 * - warehouseId: 仓库ID，标识数据来源的仓库
 * - warehouseName: 仓库名称，便于前端显示
 * - deviceSn: 设备序列号，唯一标识温控设备
 * - clientId: 客户端ID，用于设备连接管理
 * - temperature: 温度值（摄氏度）
 * - humidity: 湿度值（百分比）
 * - timestamp: 数据采集时间戳（LocalDateTime格式）
 * - tenantId: 租户ID，用于多租户数据隔离
 * - pushTime: 数据推送时间戳（LocalDateTime格式）
 * - alarmType: 可选，报警类型（高温/低温/超时）
 * - alarmMessage: 可选，报警消息描述
 * - isLocked: 可选，仓库是否被锁定
 * - lockReason: 可选，锁库原因
 * - lockTime: 可选，锁库时间戳（LocalDateTime格式）
 */
export interface WarehouseTempMessage {
  warehouseId: number
  warehouseName: string
  deviceSn: string
  clientId: string
  temperature: number
  humidity: number
  timestamp: string // LocalDateTime格式
  tenantId: number
  pushTime: string // LocalDateTime格式
  alarmType?: 'HIGH_TEMP' | 'LOW_TEMP' | 'TIMEOUT'
  alarmMessage?: string
  isLocked?: boolean
  lockReason?: string
  lockTime?: string // LocalDateTime格式
  minTemperature?: number // 最低温度
  maxTemperature?: number // 最高温度
}

/**
 * WebSocket事件回调类型接口
 * 
 * 定义了WebSocket生命周期和消息处理的回调函数：
 * - onOpen: 连接建立成功时的回调
 * - onClose: 连接断开时的回调
 * - onError: 连接或通信错误时的回调
 * - onTempData: 接收到温控数据时的回调
 * - onAlarm: 接收到温控报警时的回调
 */
export interface WarehouseTempWebSocketCallbacks {
  onOpen?: () => void
  onClose?: () => void
  onError?: (error: Event) => void
  onTempData?: (message: WarehouseTempMessage) => void
  onAlarm?: (message: WarehouseTempMessage) => void
}

/**
 * WebSocket连接状态枚举
 * 
 * 定义了WebSocket连接的四种状态：
 * - CONNECTING: 连接正在建立中，握手阶段
 * - OPEN: 连接已建立，可以进行双向通信
 * - CLOSING: 连接正在关闭中，正在发送关闭帧
 * - CLOSED: 连接已关闭或无法建立连接
 */
export enum WebSocketStatus {
  CONNECTING = 'CONNECTING',
  OPEN = 'OPEN',
  CLOSING = 'CLOSING',
  CLOSED = 'CLOSED'
}

/**
 * 仓库温控WebSocket管理类
 * 
 * 这是前端WebSocket连接的核心管理类，负责：
 * 1. 建立和维护与后端的WebSocket连接
 * 2. 处理连接断开后的自动重连机制
 * 3. 管理仓库温控数据的订阅和取消订阅
 * 4. 处理服务端推送的温控数据和报警消息
 * 5. 提供统一的错误处理和状态管理
 * 
 * 连接建立流程：
 * 1. 获取用户认证Token
 * 2. 构建WebSocket连接URL（包含Token参数）
 * 3. 建立WebSocket连接并绑定事件处理器
 * 4. 握手成功后重新订阅之前订阅的仓库
 * 
 * 消息处理流程：
 * 1. 接收服务端推送的JSON消息
 * 2. 解析消息类型和内容
 * 3. 根据消息类型调用对应的回调函数
 * 4. 特殊处理温控数据和报警消息
 * 
 * 重连机制：
 * - 连接意外断开时自动尝试重连
 * - 支持最大重连次数限制，避免无限重连
 * - 采用固定间隔的重连策略
 * - 重连成功后自动恢复订阅状态
 */
export class WarehouseTempWebSocketManager {
  /** WebSocket连接实例 */
  private websocket: WebSocket | null = null
  
  /** 事件回调函数集合 */
  private callbacks: WarehouseTempWebSocketCallbacks = {}
  
  /** 重连定时器，用于延迟重连 */
  private reconnectTimer: NodeJS.Timeout | null = null
  
  /** 当前重连尝试次数 */
  private reconnectAttempts = 0
  
  /** 最大重连尝试次数，超过后停止重连 */
  private maxReconnectAttempts = 5
  
  /** 重连间隔时间（毫秒） */
  private reconnectInterval = 5000
  
  /** 当前WebSocket连接状态 */
  private status: WebSocketStatus = WebSocketStatus.CLOSED
  
  /** 已订阅的仓库ID集合，用于重连后恢复订阅 */
  private subscribedWarehouseIds: Set<number> = new Set()
  
  /** 待订阅队列，存储连接未建立时的订阅请求 */
  private pendingSubscriptions: Set<number> = new Set()

  /**
   * 构造函数
   * 
   * @param callbacks 可选的回调函数集合，用于处理WebSocket事件
   */
  constructor(callbacks?: WarehouseTempWebSocketCallbacks) {
    this.callbacks = callbacks || {}
  }

  /**
   * 连接WebSocket
   * 
   * 建立与后端仓库温控WebSocket服务的连接：
   * 1. 获取用户认证Token，确保有权限访问
   * 2. 构建包含Token的WebSocket连接URL
   * 3. 创建WebSocket实例并绑定事件处理器
   * 4. 更新连接状态为CONNECTING
   * 
   * 注意：如果无法获取Token，连接将被拒绝
   */
  connect(): void {
    try {
      const token = getAccessToken()
      if (!token) {
        console.warn('未获取到访问令牌，无法建立WebSocket连接')
        return
      }

      const wsUrl = `ws://localhost:58080/erp-stock/ws?token=${token}`
      this.websocket = new WebSocket(wsUrl)
      this.status = WebSocketStatus.CONNECTING

      this.websocket.onopen = this.handleOpen.bind(this)
      this.websocket.onmessage = this.handleMessage.bind(this)
      this.websocket.onclose = this.handleClose.bind(this)
      this.websocket.onerror = this.handleError.bind(this)
    } catch (error) {
      console.error('创建仓库温控WebSocket连接失败:', error)
      this.status = WebSocketStatus.CLOSED
    }
  }

  /**
   * 断开WebSocket连接
   * 
   * 主动断开WebSocket连接并清理相关资源：
   * 1. 清除重连定时器，停止自动重连
   * 2. 关闭WebSocket连接
   * 3. 更新连接状态为CLOSED
   * 4. 清空已订阅的仓库列表
   * 
   * 调用此方法后，不会触发自动重连机制
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
    this.subscribedWarehouseIds.clear()
    this.pendingSubscriptions.clear() // 清空待订阅队列
  }

  /**
   * 获取连接状态
   * 
   * @returns 当前WebSocket连接状态
   */
  getStatus(): WebSocketStatus {
    return this.status
  }

  /**
   * 是否已连接
   * 
   * @returns true表示WebSocket连接已建立且可用，false表示连接未建立或不可用
   */
  isConnected(): boolean {
    return this.status === WebSocketStatus.OPEN
  }

  /**
   * 设置回调函数
   * 
   * 动态更新WebSocket事件回调函数，新的回调会与现有回调合并
   * 
   * @param callbacks 要设置的回调函数集合
   */
  setCallbacks(callbacks: WarehouseTempWebSocketCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }

  /**
   * 订阅仓库温控数据
   * 
   * 向后端发送订阅请求，开始接收指定仓库的温控数据：
   * 1. 检查WebSocket连接状态，未连接时拒绝操作
   * 2. 过滤出尚未订阅的仓库ID，避免重复订阅
   * 3. 发送订阅消息到后端
   * 4. 更新本地订阅状态记录
   * 
   * @param warehouseIds 要订阅的仓库ID数组
   */
  subscribe(warehouseIds: number[]): void {

    
    // 将新的订阅请求添加到待订阅队列
    warehouseIds.forEach(id => {
      if (!this.subscribedWarehouseIds.has(id)) {
        this.pendingSubscriptions.add(id)
      }
    })
    
    if (!this.isConnected()) {

      return
    }

    // 处理待订阅队列
    this.processPendingSubscriptions()
  }

  /**
   * 取消订阅仓库温控数据
   * 
   * 向后端发送取消订阅请求，停止接收指定仓库的温控数据：
   * 1. 检查WebSocket连接状态，未连接时拒绝操作
   * 2. 过滤出已订阅的仓库ID，避免取消未订阅的仓库
   * 3. 发送取消订阅消息到后端
   * 4. 更新本地订阅状态记录
   * 
   * @param warehouseIds 要取消订阅的仓库ID数组
   */
  unsubscribe(warehouseIds: number[]): void {
    if (!this.isConnected()) {
      console.warn('WebSocket未连接，无法取消订阅')
      return
    }

    const existingIds = warehouseIds.filter(id => this.subscribedWarehouseIds.has(id))
    if (existingIds.length === 0) {
      return
    }

    const message = {
      type: 'warehouse_subscribe',
      content: {
        type: 'unsubscribe',
        warehouseIds: existingIds
      }
    }

    this.send(message)
    existingIds.forEach(id => this.subscribedWarehouseIds.delete(id))

  }

  /**
   * 获取已订阅的仓库ID列表
   * 
   * @returns 当前已订阅的所有仓库ID数组
   */
  getSubscribedWarehouseIds(): number[] {
    return Array.from(this.subscribedWarehouseIds)
  }

  /**
   * 发送消息
   * 
   * 向WebSocket服务端发送JSON格式的消息：
   * 1. 检查WebSocket连接状态
   * 2. 将消息对象序列化为JSON字符串
   * 3. 通过WebSocket发送消息
   * 
   * @param message 要发送的消息对象
   */
  private send(message: any): void {
    if (this.websocket && this.status === WebSocketStatus.OPEN) {
      this.websocket.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket未连接，无法发送消息')
    }
  }

  /**
   * 处理连接打开
   * 
   * WebSocket连接建立成功时的处理逻辑：
   * 1. 更新连接状态为OPEN
   * 2. 重置重连尝试次数
   * 3. 调用用户定义的onOpen回调
   * 4. 重新订阅之前订阅的仓库（用于重连后恢复状态）
   */
  private handleOpen(): void {

    this.status = WebSocketStatus.OPEN
    this.reconnectAttempts = 0
    this.callbacks.onOpen?.()

    // 使用setTimeout确保连接状态完全稳定后再处理订阅
    setTimeout(() => {
      // 重新订阅之前的仓库（重连场景）
      if (this.subscribedWarehouseIds.size > 0) {
        const warehouseIds = Array.from(this.subscribedWarehouseIds)
        this.subscribedWarehouseIds.clear()
        warehouseIds.forEach(id => this.pendingSubscriptions.add(id))
      }
      
      // 处理待订阅队列
      this.processPendingSubscriptions()
    }, 100) // 延迟100ms确保连接状态稳定
  }

  /**
   * 处理消息接收
   * 
   * 接收并处理来自WebSocket服务端的消息：
   * 1. 解析JSON格式的消息数据
   * 2. 调用消息处理函数进行业务逻辑处理
   * 3. 捕获并记录解析错误
   * 
   * @param event WebSocket消息事件
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data: WebSocketMessage = JSON.parse(event.data)
      this.processMessage(data)
    } catch (error) {
      console.error('解析仓库温控WebSocket消息失败:', error)
    }
  }

  /**
   * 处理连接关闭
   * 
   * WebSocket连接关闭时的处理逻辑：
   * 1. 更新连接状态为CLOSED
   * 2. 调用用户定义的onClose回调
   * 3. 启动自动重连机制（如果符合重连条件）
   */
  private handleClose(): void {

    this.status = WebSocketStatus.CLOSED
    this.callbacks.onClose?.()
    this.attemptReconnect()
  }

  /**
   * 处理连接错误
   * 
   * WebSocket连接或通信发生错误时的处理逻辑：
   * 1. 记录错误信息到控制台
   * 2. 更新连接状态为CLOSED
   * 3. 调用用户定义的onError回调
   * 
   * @param error 错误事件对象
   */
  private handleError(error: Event): void {
    console.error('仓库温控WebSocket连接错误:', error)
    this.status = WebSocketStatus.CLOSED
    this.callbacks.onError?.(error)
  }

  /**
   * 处理具体消息类型
   * 
   * 根据消息类型分发到对应的处理函数：
   * - warehouse_temp_data: 温控数据消息，调用handleTempData处理
   * - temp_alarm: 温控报警消息，调用handleTempAlarm处理
   * - 其他类型: 记录警告信息
   * 
   * @param data 解析后的WebSocket消息对象
   */
  private processMessage(data: WebSocketMessage): void {

    
    switch (data.type) {
      case 'warehouse_temp_data': // 匹配后端WebSocketMessageTypeConstants.WAREHOUSE_TEMP_DATA

        this.handleTempData(data.content)
        break
      case 'temp_alarm':

        this.handleTempAlarm(data.content)
        break
      default:
        console.warn('[前端WebSocket] 未知的消息类型:', data.type, '完整消息:', data)
    }
  }

  /**
   * 处理温控数据消息
   * 
   * 处理从后端推送的仓库温控数据：
   * 1. 解析JSON字符串格式的温控数据
   * 2. 记录接收到的温控数据到控制台
   * 3. 调用用户定义的onTempData回调函数
   * 
   * @param tempData 温控数据消息对象或JSON字符串
   */
  private handleTempData(tempData: WarehouseTempMessage | string): void {
    let parsedData: WarehouseTempMessage
    
    // 如果是字符串，需要解析JSON
    if (typeof tempData === 'string') {
      try {
        parsedData = JSON.parse(tempData)

      } catch (error) {
        console.error('解析温控数据JSON失败:', error, '原始数据:', tempData)
        return
      }
    } else {
      parsedData = tempData
    }
    

    this.callbacks.onTempData?.(parsedData)
  }

  /**
   * 处理温控报警消息
   * 
   * 处理从后端推送的仓库温控报警：
   * 1. 解析JSON字符串格式的报警数据
   * 2. 记录接收到的报警信息到控制台
   * 3. 调用用户定义的onAlarm回调函数
   * 
   * @param alarmData 温控报警消息对象或JSON字符串
   */
  private handleTempAlarm(alarmData: WarehouseTempMessage | string): void {
    let parsedData: WarehouseTempMessage
    
    // 如果是字符串，需要解析JSON
    if (typeof alarmData === 'string') {
      try {
        parsedData = JSON.parse(alarmData)

      } catch (error) {
        console.error('解析温控报警JSON失败:', error, '原始数据:', alarmData)
        return
      }
    } else {
      parsedData = alarmData
    }
    

    this.callbacks.onAlarm?.(parsedData)
  }

  /**
   * 尝试重连
   * 
   * 自动重连机制的核心逻辑：
   * 1. 检查是否已达到最大重连次数限制
   * 2. 增加重连尝试计数器
   * 3. 设置延迟定时器，在指定间隔后尝试重连
   * 4. 重连成功后会自动恢复之前的订阅状态
   * 
   * 重连策略：
   * - 采用固定间隔重连，避免对服务器造成压力
   * - 有最大重连次数限制，防止无限重连
   * - 只在连接状态为CLOSED时才执行重连
   */
  /**
   * 处理待订阅队列
   * 
   * 处理所有在待订阅队列中的仓库ID：
   * 1. 检查WebSocket连接状态
   * 2. 过滤出尚未订阅的仓库ID
   * 3. 发送订阅消息到后端
   * 4. 更新订阅状态并清空待订阅队列
   */
  private processPendingSubscriptions(): void {
    if (!this.isConnected() || this.pendingSubscriptions.size === 0) {
      return
    }

    const pendingIds = Array.from(this.pendingSubscriptions)
    const newIds = pendingIds.filter(id => !this.subscribedWarehouseIds.has(id))
    

    
    if (newIds.length === 0) {
      this.pendingSubscriptions.clear()
      return
    }

    const message = {
      type: 'warehouse_subscribe',
      content: {
        type: 'subscribe',
        warehouseIds: newIds
      }
    }


    this.send(message)
    newIds.forEach(id => this.subscribedWarehouseIds.add(id))
    this.pendingSubscriptions.clear()
    

  }

  /**
   * 尝试重连
   * 
   * 自动重连机制的核心逻辑：
   * 1. 检查是否已达到最大重连次数限制
   * 2. 增加重连尝试计数器
   * 3. 设置延迟定时器，在指定间隔后尝试重连
   * 4. 重连成功后会自动恢复之前的订阅状态
   * 
   * 重连策略：
   * - 采用固定间隔重连，避免对服务器造成压力
   * - 有最大重连次数限制，防止无限重连
   * - 只在连接状态为CLOSED时才执行重连
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('仓库温控WebSocket重连次数已达上限，停止重连')
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

/**
 * 创建单例实例
 * 
 * 提供一个全局的WebSocket管理器实例，方便在整个应用中使用：
 * - 避免重复创建WebSocket连接
 * - 提供统一的温控数据接收入口
 * - 简化组件间的WebSocket状态共享
 * 
 * 使用方式：
 * ```typescript
 * import { warehouseTempWebSocket } from '@/utils/websocket/warehouse-temp'
 * 
 * // 设置回调函数
 * warehouseTempWebSocket.setCallbacks({
 *   onTempData: (data) => // 处理温控数据
 * })
 * 
 * // 建立连接
 * warehouseTempWebSocket.connect()
 * 
 * // 订阅仓库
 * warehouseTempWebSocket.subscribe([123, 456])
 * ```
 */
export const warehouseTempWebSocket = new WarehouseTempWebSocketManager()
