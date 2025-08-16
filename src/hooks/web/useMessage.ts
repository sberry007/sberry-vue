import { ElMessage, ElMessageBox, ElNotification, MessageBoxData } from 'element-plus'
import { useI18n } from './useI18n'

/**
 * 消息与弹窗工具方法封装
 */
export const useMessage = () => {
  const { t } = useI18n()
  return {
    /**
     * 显示普通信息消息（右上角，自动消失）
     * @param content 消息内容
     */
    info(content: string): void {
      ElMessage.info(content)
    },

    /**
     * 显示错误消息（右上角，自动消失）
     * @param content 消息内容
     */
    error(content: string): void {
      ElMessage.error(content)
    },

    /**
     * 显示成功消息（右上角，自动消失）
     * @param content 消息内容
     */
    success(content: string): void {
      ElMessage.success(content)
    },

    /**
     * 显示警告消息（右上角，自动消失）
     * @param content 消息内容
     */
    warning(content: string): void {
      ElMessage.warning(content)
    },

    /**
     * 弹出信息提示框（中间弹窗，仅有“确定”按钮）
     * @param content 提示内容
     * @returns Promise，用户点击“确定”后 resolve
     */
    alert(content: string): Promise<MessageBoxData> {
      return ElMessageBox.alert(content, t('提示'), { type: 'info' })
    },

    /**
     * 弹出错误提示框（中间弹窗，仅有“确定”按钮，红色）
     * @param content 提示内容
     * @returns Promise，用户点击“确定”后 resolve
     */
    alertError(content: string): Promise<MessageBoxData> {
      return ElMessageBox.alert(content, t('提示'), { type: 'error' })
    },

    /**
     * 弹出成功提示框（中间弹窗，仅有“确定”按钮，绿色）
     * @param content 提示内容
     * @returns Promise，用户点击“确定”后 resolve
     */
    alertSuccess(content: string): Promise<MessageBoxData> {
      return ElMessageBox.alert(content, t('提示'), { type: 'success' })
    },

    /**
     * 弹出警告提示框（中间弹窗，仅有“确定”按钮，黄色）
     * @param content 提示内容
     * @returns Promise，用户点击“确定”后 resolve
     */
    alertWarning(content: string): Promise<MessageBoxData> {
      return ElMessageBox.alert(content, t('提示'), { type: 'warning' })
    },

    /**
     * 显示通知（右上角，自动消失）
     * @param content 通知内容
     * @param type 通知类型（info/success/warning/error），默认info
     */
    notify(content: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
      ElNotification[type](content)
    },

    /**
     * 弹出确认对话框（有“确定”和“取消”按钮）
     * @param content 对话框内容
     * @param tip 对话框标题，默认“提示”
     * @returns Promise，用户点击“确定”resolve，点击“取消”reject
     */
    confirm(content: string, tip?: string): Promise<any> {
      return ElMessageBox.confirm(content, tip ?? t('提示'), {
        confirmButtonText: t('common.ok'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      })
    },

    /**
     * 弹出删除确认对话框（有“确定”和“取消”按钮，内容和标题可自定义）
     * @param content 对话框内容，默认“common.delMessage”
     * @param tip 对话框标题，默认“提示”
     * @returns Promise，用户点击“确定”resolve，点击“取消”reject
     */
    delConfirm(content: string = t('common.delMessage'), tip: string = t('提示')): Promise<any> {
      return ElMessageBox.confirm(content, tip, {
        confirmButtonText: t('common.ok'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      })
    },

    /**
     * 弹出导出确认对话框（有“确定”和“取消”按钮，内容和标题可自定义）
     * @param content 对话框内容，默认“common.exportMessage”
     * @param tip 对话框标题，默认“提示”
     * @returns Promise，用户点击“确定”resolve，点击“取消”reject
     */
    exportConfirm(content: string = t('common.exportMessage'), tip: string = t('提示')): Promise<any> {
      return ElMessageBox.confirm(content, tip, {
        confirmButtonText: t('common.ok'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      })
    },

    /**
     * 弹出输入框对话框（有“确定”和“取消”按钮，带输入框）
     * @param content 对话框内容
     * @param tip 对话框标题
     * @returns Promise，用户点击“确定”resolve，点击“取消”reject
     */
    prompt(content: string, tip: string): Promise<any> {
      return ElMessageBox.prompt(content, tip, {
        confirmButtonText: t('common.ok'),
        cancelButtonText: t('common.cancel'),
        type: 'warning'
      })
    }
  }
}
