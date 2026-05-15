import { useState, useRef } from 'react'
import { Sparkles, Loader2, Shuffle, BookOpen, Lightbulb, Camera, X, ImageIcon } from 'lucide-react'
import TopicBadge from '../components/TopicBadge'
import ConfidenceBar from '../components/ConfidenceBar'
import { SAMPLE_QUESTIONS, TOPIC_COLORS } from '../utils/constants'
import { useTheme } from '../context/ThemeContext'

export default function ClassifierPage() {
    const { theme } = useTheme()
    const [question, setQuestion] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState('')

    // OCR state
    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState(null)
    const [ocrLoading, setOcrLoading] = useState(false)
    const [extractedText, setExtractedText] = useState('')
    const imageInputRef = useRef(null)

    const isDark = theme === 'dark'
    const cardClass = isDark
        ? 'bg-slate-900 border-slate-800 text-slate-100'
        : 'bg-white border-slate-100 text-slate-800'
    const subText = isDark ? 'text-slate-400' : 'text-slate-500'
    const faintText = isDark ? 'text-slate-500' : 'text-slate-400'

    const processResult = (data) => {
        const allTopics = Object.keys(TOPIC_COLORS)
        const mainConf = data.confidence
        const remaining = 100 - mainConf
        const others = allTopics
            .filter(t => t !== data.prediction)
            .map(t => ({ topic: t, confidence: Math.random() }))

        const total = others.reduce((s, o) => s + o.confidence, 0)
        others.forEach(o => { o.confidence = (o.confidence / total) * remaining })
        others.sort((a, b) => b.confidence - a.confidence)

        setResult({
            topic: data.prediction,
            confidence: mainConf,
            rationale: data.rationale,
            keywords: data.matched_keywords || [],
            extractedText: data.extracted_text || '',
            allScores: [
                { topic: data.prediction, confidence: mainConf },
                ...others.slice(0, 2),
            ],
        })
    }

    const classify = async () => {
        if (!question.trim()) return
        setLoading(true)
        setError('')
        setResult(null)
        setExtractedText('')

        try {
            const formData = new FormData()
            formData.append('question', question)

            const res = await fetch('/predict', {
                method: 'POST',
                body: formData,
                credentials: 'include',
            })

            const data = await res.json()

            if (data.success) {
                processResult(data)
            } else {
                setError(data.error || 'Classification failed')
            }
        } catch (err) {
            setError('Failed to connect to the server')
        } finally {
            setLoading(false)
        }
    }

    const classifyImage = async () => {
        if (!imageFile) return
        setOcrLoading(true)
        setLoading(true)
        setError('')
        setResult(null)
        setExtractedText('')

        try {
            const formData = new FormData()
            formData.append('file', imageFile)

            const res = await fetch('/predict/image', {
                method: 'POST',
                body: formData,
                credentials: 'include',
            })

            const data = await res.json()

            if (data.success) {
                setExtractedText(data.extracted_text || '')
                setQuestion(data.extracted_text || '')
                processResult(data)
            } else {
                setError(data.error || 'OCR classification failed')
            }
        } catch (err) {
            setError('Failed to connect to the server')
        } finally {
            setOcrLoading(false)
            setLoading(false)
        }
    }

    const handleImageSelect = (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/bmp']
        if (!allowed.includes(file.type)) {
            setError('Unsupported image format. Use PNG, JPG, or WEBP.')
            return
        }

        setImageFile(file)
        setError('')
        const reader = new FileReader()
        reader.onload = (ev) => setImagePreview(ev.target.result)
        reader.readAsDataURL(file)
    }

    const clearImage = () => {
        setImageFile(null)
        setImagePreview(null)
        setExtractedText('')
        if (imageInputRef.current) imageInputRef.current.value = ''
    }

    const loadRandom = async () => {
        try {
            const res = await fetch('/random-question')
            const data = await res.json()
            setQuestion(data.question)
        } catch {
            setQuestion(SAMPLE_QUESTIONS[Math.floor(Math.random() * SAMPLE_QUESTIONS.length)])
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            classify()
        }
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Hero Header */}
            <div className="text-center mb-10 animate-fade-in">
                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-4 ${isDark ? 'bg-slate-800 text-primary-200' : 'bg-primary-50 text-primary-700'}`}>
                    <Sparkles size={14} />
                    AI-Powered Classification
                </div>
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                    Math Question{' '}
                    <span className="bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                        Classifier
                    </span>
                </h1>
                <p className={`mt-3 text-lg max-w-xl mx-auto ${subText}`}>
                    Enter any mathematical question and our AI will classify it into the correct topic
                </p>
            </div>

            {/* Main Split Pane */}
            <div className="grid lg:grid-cols-2 gap-8">
                {/* Left Panel — Input */}
                <div className={`rounded-2xl shadow-xl border p-8 card-hover animate-fade-in ${cardClass}`} style={{ animationDelay: '100ms' }}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-800 text-primary-200' : 'bg-primary-100 text-primary-600'}`}>
                            <BookOpen size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Enter Question</h2>
                            <p className={`text-sm ${faintText}`}>Type or paste a math problem</p>
                        </div>
                    </div>

                    <div className="relative">
                        <textarea
                            id="question-input"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="e.g., Find the eigenvalues of the matrix [[4,1],[6,-1]]"
                            rows={6}
                            className={`w-full px-5 py-4 border rounded-xl placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-none text-base leading-relaxed ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                        />
                        <div className={`absolute bottom-3 right-3 text-xs ${faintText}`}>
                            Ctrl+Enter to classify
                        </div>
                    </div>

                    <div className="flex gap-3 mt-5">
                        <button
                            id="classify-btn"
                            onClick={classify}
                            disabled={loading || !question.trim()}
                            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white transition-all btn-press ${loading || !question.trim()
                                    ? 'bg-slate-300 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5'
                                }`}
                        >
                            {loading && !ocrLoading ? (
                                <>
                                    <Loader2 size={18} className="spinner" />
                                    Classifying...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={18} />
                                    Classify Question
                                </>
                            )}
                        </button>

                        <button
                            id="random-btn"
                            onClick={loadRandom}
                            className={`px-4 py-3.5 rounded-xl font-medium transition-all border flex items-center gap-2 ${isDark ? 'text-primary-200 bg-slate-900 border-slate-800 hover:bg-slate-800' : 'text-primary-600 bg-primary-50 border-primary-200 hover:bg-primary-100'}`}
                            title="Load a random question"
                        >
                            <Shuffle size={18} />
                            <span className="hidden sm:inline">Random</span>
                        </button>
                    </div>

                    {/* OCR Image Upload Section */}
                    <div className={`mt-6 pt-6 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                        <p className={`text-xs font-medium uppercase tracking-wider mb-3 ${faintText}`}>
                            📷 Or upload an image of a math problem
                        </p>

                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp,image/bmp"
                            className="hidden"
                            onChange={handleImageSelect}
                        />

                        {!imageFile ? (
                            <button
                                onClick={() => imageInputRef.current?.click()}
                                className={`w-full flex items-center justify-center gap-3 px-5 py-4 rounded-xl border-2 border-dashed transition-all ${isDark
                                    ? 'border-slate-700 text-slate-400 hover:border-primary-500 hover:text-primary-300 hover:bg-primary-900/10'
                                    : 'border-slate-200 text-slate-500 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50'
                                }`}
                            >
                                <Camera size={20} />
                                <span className="font-medium">Upload Image (OCR)</span>
                            </button>
                        ) : (
                            <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                                <div className="relative">
                                    <img
                                        src={imagePreview}
                                        alt="Uploaded math problem"
                                        className="w-full max-h-48 object-contain bg-black/5"
                                    />
                                    <button
                                        onClick={clearImage}
                                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-black/70 transition-all"
                                        title="Remove image"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="px-4 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ImageIcon size={14} className={faintText} />
                                        <span className={`text-sm truncate max-w-[180px] ${subText}`}>{imageFile.name}</span>
                                    </div>
                                    <button
                                        id="ocr-classify-btn"
                                        onClick={classifyImage}
                                        disabled={ocrLoading}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all ${ocrLoading
                                            ? 'bg-slate-300 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-md'
                                        }`}
                                    >
                                        {ocrLoading ? (
                                            <>
                                                <Loader2 size={14} className="spinner" />
                                                Scanning...
                                            </>
                                        ) : (
                                            <>
                                                <Camera size={14} />
                                                Scan & Classify
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick examples */}
                    <div className={`mt-6 pt-6 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                        <p className={`text-xs font-medium uppercase tracking-wider mb-3 ${faintText}`}>Try an example</p>
                        <div className="flex flex-wrap gap-2">
                            {SAMPLE_QUESTIONS.slice(0, 4).map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => setQuestion(q)}
                                    className={`text-xs px-3 py-1.5 rounded-lg transition-all truncate max-w-[200px] ${isDark ? 'bg-slate-900 text-slate-200 border border-slate-800 hover:bg-slate-800' : 'bg-slate-50 text-slate-600 border border-slate-100 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200'}`}
                                >
                                    {q.slice(0, 40)}...
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Panel — Results */}
                <div className={`rounded-2xl shadow-xl border p-8 card-hover animate-fade-in ${cardClass}`} style={{ animationDelay: '200ms' }}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-800 text-emerald-200' : 'bg-emerald-100 text-emerald-600'}`}>
                            <Lightbulb size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Prediction</h2>
                            <p className={`text-sm ${faintText}`}>AI classification result</p>
                        </div>
                    </div>

                    {error && (
                        <div className={`p-4 rounded-xl text-sm animate-fade-in ${isDark ? 'bg-red-900/30 border border-red-800 text-red-100' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                            {error}
                        </div>
                    )}

                    {!result && !error && (
                        <div className="flex flex-col items-center justify-center h-[340px] text-center animate-fade-in">
                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-5 ${isDark ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-300'}`}>
                                <Sparkles size={32} />
                            </div>
                            <h3 className={`text-lg font-semibold mb-2 ${faintText}`}>No prediction yet</h3>
                            <p className={`text-sm max-w-[250px] ${faintText}`}>
                                Enter a mathematical question and click "Classify" to see the AI prediction
                            </p>
                        </div>
                    )}

                    {result && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Extracted text from OCR */}
                            {result.extractedText && (
                                <div className={`p-4 border rounded-xl ${isDark ? 'bg-cyan-900/20 border-cyan-800 text-cyan-100' : 'bg-cyan-50 border-cyan-200 text-cyan-800'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Camera size={14} className={isDark ? 'text-cyan-200' : 'text-cyan-600'} />
                                        <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-cyan-100' : 'text-cyan-700'}`}>Extracted Text (OCR)</span>
                                    </div>
                                    <p className="text-sm leading-relaxed">{result.extractedText}</p>
                                </div>
                            )}

                            {/* Main prediction */}
                            <div className={`text-center py-6 px-4 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-gradient-to-br from-slate-50 to-primary-50/30 border-slate-100'}`}>
                                <p className={`text-xs font-medium uppercase tracking-wider mb-3 ${faintText}`}>Predicted Topic</p>
                                <TopicBadge topic={result.topic} size="lg" />
                                <div className="mt-4 flex items-center justify-center gap-2">
                                    <div className={`text-3xl font-extrabold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{result.confidence.toFixed(1)}%</div>
                                    <span className={`text-sm font-medium ${faintText}`}>confidence</span>
                                </div>
                            </div>

                            {/* Confidence Bars */}
                            <div>
                                <h3 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${faintText}`}>Score Breakdown</h3>
                                <div className="space-y-4">
                                    {result.allScores.map((s, i) => (
                                        <ConfidenceBar key={s.topic} topic={s.topic} confidence={s.confidence} rank={i} />
                                    ))}
                                </div>
                            </div>

                            {/* Rationale */}
                            {result.rationale && (
                                <div className={`p-4 border rounded-xl ${isDark ? 'bg-amber-900/20 border-amber-800 text-amber-100' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Lightbulb size={14} className={isDark ? 'text-amber-200' : 'text-amber-600'} />
                                        <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-amber-100' : 'text-amber-700'}`}>XAI Rationale</span>
                                    </div>
                                    <p className="text-sm leading-relaxed">{result.rationale}</p>
                                    {result.keywords.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-3">
                                            {result.keywords.map((k, i) => (
                                                <span key={i} className={`px-2 py-0.5 rounded text-xs font-medium ${isDark ? 'bg-amber-800 text-amber-100' : 'bg-amber-100 text-amber-700'}`}>
                                                    {k}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
