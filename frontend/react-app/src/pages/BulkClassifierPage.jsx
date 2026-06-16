import { useState, useRef, useCallback } from 'react'
import { Upload, FileSpreadsheet, Loader2, Download, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'
import { TOPIC_COLORS } from '../utils/constants'
import api from '../utils/api'

const ROWS_PER_PAGE = 10

export default function BulkClassifierPage() {
    const { theme } = useTheme()
    const { t } = useLanguage()
    const isDark = theme === 'dark'

    const [file, setFile] = useState(null)
    const [dragging, setDragging] = useState(false)
    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [results, setResults] = useState(null)
    const [error, setError] = useState('')
    const [page, setPage] = useState(0)
    const fileInputRef = useRef(null)
    const uploadedFileRef = useRef(null)

    // Theme classes
    const cardClass = isDark
        ? 'bg-slate-900 border-slate-800 text-slate-100'
        : 'bg-white border-slate-100 text-slate-800'
    const subText = isDark ? 'text-slate-400' : 'text-slate-500'
    const faintText = isDark ? 'text-slate-500' : 'text-slate-400'

    const ACCEPTED = ['.csv', '.xlsx', '.xls']

    const validateFile = (f) => {
        const ext = '.' + f.name.split('.').pop().toLowerCase()
        if (!ACCEPTED.includes(ext)) {
            setError(t('bulk_unsupported'))
            return false
        }
        if (f.size > 10 * 1024 * 1024) {
            setError(t('bulk_too_large'))
            return false
        }
        return true
    }

    const handleFile = (f) => {
        setError('')
        setResults(null)
        setPage(0)
        if (validateFile(f)) {
            setFile(f)
            uploadedFileRef.current = f
        }
    }

    // Drag and drop handlers
    const onDragOver = useCallback((e) => { e.preventDefault(); setDragging(true) }, [])
    const onDragLeave = useCallback((e) => { e.preventDefault(); setDragging(false) }, [])
    const onDrop = useCallback((e) => {
        e.preventDefault()
        setDragging(false)
        const droppedFile = e.dataTransfer.files?.[0]
        if (droppedFile) handleFile(droppedFile)
    }, [])

    const handleInputChange = (e) => {
        const selected = e.target.files?.[0]
        if (selected) handleFile(selected)
    }

    const classify = async () => {
        if (!uploadedFileRef.current) return
        setLoading(true)
        setError('')
        setResults(null)
        setProgress(0)

        // Simulate progress while waiting for the server
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) { clearInterval(interval); return 90 }
                return prev + Math.random() * 15
            })
        }, 400)

        try {
            const formData = new FormData()
            formData.append('file', uploadedFileRef.current)

            const res = await api.post('/classify-bulk', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })

            clearInterval(interval)
            setProgress(100)

            if (res.data.success) {
                setTimeout(() => {
                    setResults(res.data)
                    setLoading(false)
                }, 300)
            } else {
                setError(res.data.error || t('classifier_failed'))
                setLoading(false)
            }
        } catch (err) {
            clearInterval(interval)
            const msg = err.response?.data?.error || err.message || t('classifier_server_error')
            setError(msg)
            setLoading(false)
        }
    }

    const downloadResults = async () => {
        if (!uploadedFileRef.current) return
        try {
            const formData = new FormData()
            formData.append('file', uploadedFileRef.current)

            const res = await api.post('/classify-bulk/download', formData, {
                responseType: 'blob',
                headers: { 'Content-Type': 'multipart/form-data' },
            })

            const url = window.URL.createObjectURL(new Blob([res.data]))
            const a = document.createElement('a')
            a.href = url
            a.download = 'bulk_classification_results.xlsx'
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(url)
        } catch (err) {
            setError(t('bulk_download_failed'))
        }
    }

    const resetState = () => {
        setFile(null)
        setResults(null)
        setError('')
        setProgress(0)
        setPage(0)
        uploadedFileRef.current = null
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    // Pagination
    const totalPages = results ? Math.ceil(results.results.length / ROWS_PER_PAGE) : 0
    const pageResults = results ? results.results.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE) : []

    const getTopicStyle = (topic) => {
        const c = TOPIC_COLORS[topic]
        if (!c) return { bg: 'bg-gray-100', text: 'text-gray-700' }
        return c
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="text-center mb-10 animate-fade-in">
                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-4 ${isDark ? 'bg-slate-800 text-primary-200' : 'bg-primary-50 text-primary-700'}`}>
                    <FileSpreadsheet size={14} />
                    {t('bulk_badge')}
                </div>
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                    {t('bulk_title_1')}{' '}
                    <span className="bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                        {t('bulk_title_2')}
                    </span>
                </h1>
                <p className={`mt-3 text-lg max-w-xl mx-auto ${subText}`}>
                    {t('bulk_desc')}
                </p>
            </div>

            {/* Upload Area */}
            {!results && !loading && (
                <div className="max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '100ms' }}>
                    <div
                        className={`rounded-2xl shadow-xl border-2 border-dashed p-12 text-center cursor-pointer transition-all ${dragging
                            ? isDark
                                ? 'border-primary-400 bg-primary-900/20 shadow-primary-500/20 shadow-2xl'
                                : 'border-primary-400 bg-primary-50 shadow-primary-200/50 shadow-2xl'
                            : file
                                ? isDark
                                    ? 'border-emerald-500 bg-emerald-900/10'
                                    : 'border-emerald-400 bg-emerald-50'
                                : isDark
                                    ? 'border-slate-700 bg-slate-900 hover:border-slate-600 hover:bg-slate-800/50'
                                    : 'border-slate-200 bg-white hover:border-primary-300 hover:bg-primary-50/30'
                            }`}
                        onDragOver={onDragOver}
                        onDragLeave={onDragLeave}
                        onDrop={onDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            className="hidden"
                            onChange={handleInputChange}
                        />

                        {file ? (
                            <div className="space-y-4">
                                <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${isDark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-600'}`}>
                                    <CheckCircle2 size={32} />
                                </div>
                                <div>
                                    <p className="text-lg font-semibold">{file.name}</p>
                                    <p className={`text-sm mt-1 ${faintText}`}>{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); resetState() }}
                                    className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-all ${isDark ? 'text-slate-400 hover:text-red-400 hover:bg-red-900/20' : 'text-slate-500 hover:text-red-600 hover:bg-red-50'}`}
                                >
                                    <X size={14} />
                                    {t('bulk_remove')}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-400'}`}>
                                    <Upload size={32} />
                                </div>
                                <div>
                                    <p className="text-lg font-semibold">
                                        {t('bulk_drag')}
                                    </p>
                                    <p className={`text-sm mt-1 ${faintText}`}>
                                        {t('bulk_browse')} <span className="font-medium">.csv</span> or <span className="font-medium">.xlsx</span>
                                    </p>
                                </div>
                                <p className={`text-xs ${faintText}`}>
                                    {t('bulk_column')} <span className={`font-mono px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{t('bulk_column_name')}</span> {t('bulk_column_suffix')}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Classify Button */}
                    {file && (
                        <div className="mt-6 text-center animate-fade-in">
                            <button
                                id="bulk-classify-btn"
                                onClick={classify}
                                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5 transition-all btn-press"
                            >
                                <Sparkles size={18} />
                                {t('bulk_classify_all')}
                            </button>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className={`mt-6 p-4 rounded-xl flex items-start gap-3 animate-fade-in ${isDark ? 'bg-red-900/30 border border-red-800 text-red-100' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                            <AlertCircle size={18} className="mt-0.5 shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="max-w-2xl mx-auto animate-fade-in">
                    <div className={`rounded-2xl shadow-xl border p-10 text-center ${cardClass}`}>
                        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-6 bg-gradient-to-br from-primary-600 to-purple-600">
                            <Loader2 size={32} className="text-white spinner" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">{t('bulk_classifying')}</h3>
                        <p className={`text-sm mb-6 ${subText}`}>{t('bulk_processing')}</p>

                        {/* Progress bar */}
                        <div className={`w-full h-3 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-primary-500 to-purple-500 transition-all duration-300 ease-out"
                                style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                        </div>
                        <p className={`text-sm mt-3 font-medium ${subText}`}>{Math.round(Math.min(progress, 100))}%</p>
                    </div>
                </div>
            )}

            {/* Results */}
            {results && (
                <div className="space-y-6 animate-fade-in">
                    {/* Summary bar */}
                    <div className={`rounded-2xl shadow-xl border p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${cardClass}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-600'}`}>
                                <CheckCircle2 size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">{t('bulk_complete')}</h3>
                                <p className={`text-sm ${subText}`}>
                                    {results.total} {t('bulk_questions_classified')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={resetState}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm border transition-all ${isDark ? 'text-slate-300 border-slate-700 hover:bg-slate-800' : 'text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                            >
                                <Upload size={16} />
                                {t('bulk_new_upload')}
                            </button>
                            <button
                                id="download-results-btn"
                                onClick={downloadResults}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-lg shadow-emerald-500/25 hover:shadow-xl transition-all btn-press"
                            >
                                <Download size={16} />
                                {t('bulk_download')}
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className={`rounded-2xl shadow-xl border overflow-hidden ${cardClass}`}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className={isDark ? 'bg-slate-800/50' : 'bg-slate-50'}>
                                        <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${faintText}`}>#</th>
                                        <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${faintText}`}>{t('bulk_question')}</th>
                                        <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${faintText}`}>{t('bulk_predicted_category')}</th>
                                        <th className={`px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider ${faintText}`}>{t('bulk_confidence')}</th>
                                    </tr>
                                </thead>
                                <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                                    {pageResults.map((r, i) => {
                                        const rowNum = page * ROWS_PER_PAGE + i + 1
                                        const tc = getTopicStyle(r.predicted_topic)
                                        return (
                                            <tr key={rowNum} className={`transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}>
                                                <td className={`px-6 py-4 font-mono text-xs ${faintText}`}>{rowNum}</td>
                                                <td className="px-6 py-4 max-w-md">
                                                    <p className="truncate" title={r.question}>{r.question}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${tc.bg} ${tc.text}`}>
                                                        {tc.icon && <span>{tc.icon}</span>}
                                                        {r.predicted_topic}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`font-semibold ${r.confidence >= 80 ? (isDark ? 'text-emerald-300' : 'text-emerald-600') : r.confidence >= 60 ? (isDark ? 'text-amber-300' : 'text-amber-600') : (isDark ? 'text-red-300' : 'text-red-500')}`}>
                                                        {r.confidence}%
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className={`flex items-center justify-between px-6 py-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                                <p className={`text-sm ${subText}`}>
                                    {t('bulk_showing')} {page * ROWS_PER_PAGE + 1}–{Math.min((page + 1) * ROWS_PER_PAGE, results.results.length)} {t('bulk_of')} {results.results.length}
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(0, p - 1))}
                                        disabled={page === 0}
                                        className={`p-2 rounded-lg transition-all ${page === 0 ? 'opacity-30 cursor-not-allowed' : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setPage(i)}
                                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${page === i
                                                ? 'bg-primary-600 text-white shadow-md'
                                                : isDark
                                                    ? 'text-slate-400 hover:bg-slate-800'
                                                    : 'text-slate-500 hover:bg-slate-100'
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    )).slice(
                                        Math.max(0, page - 2),
                                        Math.min(totalPages, page + 3)
                                    )}
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                        disabled={page === totalPages - 1}
                                        className={`p-2 rounded-lg transition-all ${page === totalPages - 1 ? 'opacity-30 cursor-not-allowed' : isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Error on download */}
                    {error && (
                        <div className={`p-4 rounded-xl flex items-start gap-3 animate-fade-in ${isDark ? 'bg-red-900/30 border border-red-800 text-red-100' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                            <AlertCircle size={18} className="mt-0.5 shrink-0" />
                            <p className="text-sm">{error}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
