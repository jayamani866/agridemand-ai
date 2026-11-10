import { useEffect, useState } from 'react'
import { ThemeContext } from './theme-context'
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('agridemand-theme') || 'dark'
  })
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('agridemand-theme', theme)
  }, [theme])
  const toggleTheme = () => {
    setTheme((current) => current === 'dark' ? 'light' : 'dark')
  }
  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
