import { onScopeDispose, ref } from 'vue'

type RefreshHandler = () => void | Promise<void>

// 当前页面注册的刷新处理函数（仅客户端交互使用）
const refreshHandler = ref<RefreshHandler | null>(null)

/**
 * 顶部导航共享状态：更新时间、刷新中状态，以及由各页面注册的刷新逻辑。
 * 布局负责渲染 AppHeader 并触发刷新，页面通过 onRefresh 注入自己的刷新行为。
 */
export function useAppHeader() {
  const updatedAt = useState<string | null>('header:updatedAt', () => null)
  const refreshing = useState<boolean>('header:refreshing', () => false)

  function onRefresh(fn: RefreshHandler) {
    refreshHandler.value = fn
    onScopeDispose(() => {
      if (refreshHandler.value === fn)
        refreshHandler.value = null
    })
  }

  async function triggerRefresh() {
    if (!refreshHandler.value || refreshing.value)
      return
    refreshing.value = true
    try {
      await refreshHandler.value()
      updatedAt.value = new Date().toISOString()
    }
    finally {
      refreshing.value = false
    }
  }

  return { updatedAt, refreshing, onRefresh, triggerRefresh }
}
