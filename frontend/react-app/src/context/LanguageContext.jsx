import { createContext, useContext, useCallback, useState } from 'react'
import translations from '../utils/translations'

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    if (typeof window === 'undefined') return 'en'
    return localStorage.getItem('language') || 'en'
  })

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => {
      const next = prev === 'en' ? 'tr' : 'en'
      localStorage.setItem('language', next)
      return next
    })
  }, [])

  const t = useCallback(
    (key) => {
      return translations[language]?.[key] || translations.en?.[key] || key
    },
    [language],
  )

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
