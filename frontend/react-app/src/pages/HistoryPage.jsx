import { useState, useEffect } from 'react'
import { Clock, Search, Trash2, Download, ArrowUpDown } from 'lucide-react'
import TopicBadge from '../components/TopicBadge'
import { useLanguage } from '../context/LanguageContext'

export default function HistoryPage() {
    const { t } = useLanguage()
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [sortOrder, setSortOrder] = useState('desc')

    useEffect(() => {
        fetchHistory()
    }, [])

    const fetchHistory = async () => {
        try {
            const res = await fetch('/api/history', { credentials: 'include' })
            const data = await res.json()
            setHistory(data.history || [])
        } catch (err) {
            console.error('Failed to fetch history:', err)
        } finally {
            setLoading(false)
        }
    }

    const filtered = history
        .filter(h =>
            h.question?.toLowerCase().includes(search.toLowerCase()) ||
            h.topic?.toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => {
            if (sortOrder === 'desc') return new Date(b.timestamp) - new Date(a.timestamp)
            return new Date(a.timestamp) - new Date(b.timestamp)
        })

    const exportCSV = () => {
        const csv = ['Question,Topic,Confidence,Timestamp']
        filtered.forEach(h => {
            csv.push(`"${h.question?.replace(/"/g, '""')}","${h.topic}",${h.confidence},${h.timestamp}`)
        })
        const blob = new Blob([csv.join('\n')], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'classification_history.csv'
        a.click()
    }

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800">{t('history_title')}</h1>
                    <p className="text-slate-500 mt-1">{history.length} {t('history_total')}</p>
                </div>
                <button
                    onClick={exportCSV}
                    disabled={filtered.length === 0}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
                >
                    <Download size={16} />
                    {t('history_export')}
                </button>
            </div>

            {/* Search + Sort */}
            <div className="flex gap-3 mb-6">
                <div className="flex-1 relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        id="history-search"
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('history_search')}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm"
                    />
                </div>
                <button
                    onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')}
                    className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all"
                    title={sortOrder === 'desc' ? t('history_sort_oldest') : t('history_sort_newest')}
                >
                    <ArrowUpDown size={18} />
                </button>
            </div>

            {/* History List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full spinner" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-16 text-center">
                    <Clock size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-semibold text-slate-500 mb-2">{t('history_empty')}</h3>
                    <p className="text-sm text-slate-400">{t('history_empty_desc')}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((entry, i) => (
                        <div
                            key={i}
                            className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-all group"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="text-slate-800 font-medium leading-relaxed truncate">{entry.question}</p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <TopicBadge topic={entry.topic} size="sm" />
                                        <span className="text-sm font-bold text-slate-600">{entry.confidence}%</span>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-xs text-slate-400">{entry.timestamp}</p>
                                    <p className="text-xs text-slate-400 capitalize mt-1">{entry.mode || 'predict'}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
