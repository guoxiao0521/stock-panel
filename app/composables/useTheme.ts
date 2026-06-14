import { useColorMode } from '@vueuse/core'

/** 明暗主题切换，基于 html.dark class，与 tailwind.css 的 .dark 变体一致 */
export function useTheme() {
  const mode = useColorMode({
    attribute: 'class',
    selector: 'html',
    modes: { light: '', dark: 'dark' },
    initialValue: 'light',
    storageKey: 'stock-panel-theme',
  })

  function toggle() {
    mode.value = mode.value === 'dark' ? 'light' : 'dark'
  }

  return { mode, toggle }
}
