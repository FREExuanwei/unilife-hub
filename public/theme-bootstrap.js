/* Apply the saved theme before CSS and React render; keep CSP script-src local. */
(() => {
  let preference
  try { preference = localStorage.getItem('unilife-theme') } catch { /* Storage may be blocked. */ }
  let systemDark = false
  try { systemDark = matchMedia('(prefers-color-scheme: dark)').matches } catch { /* Older browsers use light. */ }
  const dark = preference === 'dark' || (preference !== 'light' && systemDark)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b1020' : '#f0f1fc')
})()
