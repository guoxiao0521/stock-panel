import { useClipboard } from '@vueuse/core'
import { toast } from 'vue-sonner'

/** 将任意数据序列化为格式化 JSON 并写入剪贴板，统一成功/失败提示 */
export function useJsonClipboard() {
  const { copy, isSupported } = useClipboard({ legacy: true })

  async function copyJson(data: unknown, successMessage: string) {
    if (!isSupported.value) {
      toast.error('当前环境不支持剪贴板操作')
      return
    }
    try {
      await copy(JSON.stringify(data, null, 2))
      toast.success(successMessage)
    }
    catch {
      toast.error('复制失败')
    }
  }

  return { copyJson }
}
