// Interface language, chosen per browser. English unless Russian was picked.
// Strings stay next to each other where they are used: t('Map', 'Карта').
export function useLang() {
  const lang = useState<Lang>('lang', () => {
    try {
      if (localStorage.getItem('network-map:lang') === 'ru') return 'ru'
    }
    catch { /* blocked storage: English */ }
    return 'en'
  })
  function setLang(l: Lang) {
    lang.value = l
    document.documentElement.lang = l
    try { localStorage.setItem('network-map:lang', l) } catch {}
  }
  const t = (en: string, ru: string) => (lang.value === 'ru' ? ru : en)
  const L = (label: Label | undefined) => label?.[lang.value] ?? ''
  return { lang, setLang, t, L }
}
