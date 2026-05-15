// Clean rewrite of Admin dashboard
export default function AdminPage() {
    const { user } = useAuth()
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [bulkResults, setBulkResults] = useState([])
    const [history, setHistory] = useState([])
    const [historyLoading, setHistoryLoading] = useState(true)
    const [subscription, setSubscription] = useState('Free')
    const [dragActive, setDragActive] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')

    useEffect(() => {
        fetchHistory()
        fetchSubscription()
    }, [])

    const fetchHistory = async () => {
        setHistoryLoading(true)
        try {
            const res = await axios.get('/api/history', { withCredentials: true })
            setHistory(res.data?.history || [])
        } catch (err) {
            console.error('Failed to fetch history', err)
            setHistory([])
        } finally {
            setHistoryLoading(false)
        }
    }

    const fetchSubscription = async () => {
        try {
            const res = await axios.get('/subscription', { withCredentials: true })
            setSubscription(res.data?.subscription || res.data?.tier || 'Free')
        } catch (err) {
            console.error('Failed to fetch subscription', err)
            setSubscription('Free')
        }
    }

    const handleFileUpload = async (file) => {
        if (!file) return
        const formData = new FormData()
        formData.append('file', file)
        setUploading(true)
        setErrorMsg('')
        try {
            const res = await axios.post('/classify-bulk', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                withCredentials: true,
            })
            setBulkResults(res.data?.results || [])
        } catch (err) {
            console.error('Bulk classify failed', err)
            setBulkResults([])
            setErrorMsg(err?.response?.data?.error || 'Bulk classification failed')
        } finally {
            setUploading(false)
        }
    }

    const onDrop = (e) => {
        e.preventDefault()
        setDragActive(false)
        const file = e.dataTransfer.files?.[0]
        handleFileUpload(file)
    }

    const prettySubscription = useMemo(
        () => subscription?.[0]?.toUpperCase() + subscription?.slice(1),
        [subscription],
    )

    const badgeTone = subscription?.toLowerCase() === 'pro'
        ? 'bg-amber-400/10 text-amber-200 border-amber-400/30'
        : 'bg-emerald-400/10 text-emerald-200 border-emerald-400/30'

    if (user?.role !== 'admin') {
        return (
            <div className="max-w-2xl mx-auto px-4 py-20 text-center text-slate-100">
                <Shield size={64} className="mx-auto text-red-400 mb-4" />
                <h2 className="text-2xl font-bold">Access Denied</h2>
                <p className="text-slate-400">You need admin privileges to view this page.</p>
            </div>
        )
    }

    const dropdownItems = [
        { type: 'status', label: 'API Online: 120ms', icon: Activity },
        { type: 'action', label: 'AI Playground', sub: 'Test prompts in a safe sandbox', icon: Rocket },
        { type: 'action', label: 'Export Classified Data (CSV)', sub: 'Full export with filters', icon: Download },
        { type: 'highlight', label: 'Reviewing Low Confidence Labels', sub: 'Human-in-the-loop QA queue', icon: ShieldCheck },
    ]

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-100">
            <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Operations Control</p>
                    <h1 className="text-3xl font-black text-white">Admin Console</h1>
                    <p className="text-slate-400 mt-1">Monitor, triage, and export math classifications.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${badgeTone}`}>
                        {prettySubscription || 'Free'}
                    </span>
                    <div className="relative">
                        <button
                            onClick={() => setDropdownOpen((o) => !o)}
                            className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-slate-600 hover:bg-slate-750 transition-colors"
                        >
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                {user?.username?.[0]?.toUpperCase() || 'A'}
                            </div>
                            <div className="text-left">
                                <div className="text-sm font-semibold">{user?.username}</div>
                                <div className="text-xs text-slate-400">Admin</div>
                            </div>
                            <ChevronDown size={16} className="text-slate-400" />
                        </button>

                        <AnimatePresence>
                            {dropdownOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                                    transition={{ duration: 0.18, ease: 'easeOut' }}
                                    className="absolute right-0 mt-2 w-80 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden"
                                >
                                    <div className="border-b border-slate-800 bg-slate-900/80">
                                        <div className="px-4 py-3 flex items-center gap-3">
                                            <UserCircle size={22} className="text-slate-300" />
                                            <div>
                                                <p className="text-sm font-semibold text-white">{user?.username}</p>
                                                <p className="text-xs text-slate-400">Subscription: {prettySubscription}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="divide-y divide-slate-800">
                                        {dropdownItems.map((item) => (
                                            <div key={item.label}>
                                                {item.type === 'status' ? (
                                                    <div className="px-4 py-3 flex items-center gap-3 bg-slate-800/60">
                                                        <span className="relative flex h-2.5 w-2.5">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
                                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                                                        </span>
                                                        <div>
                                                            <p className="text-xs font-semibold text-emerald-200">{item.label}</p>
                                                            <p className="text-[11px] text-slate-500">Healthy latency</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={item.onClick}
                                                        className={`w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-800 transition-colors ${item.type === 'highlight' ? 'bg-amber-500/10 text-amber-100 hover:bg-amber-500/15' : ''}`}
                                                    >
                                                        <item.icon size={18} className={item.type === 'highlight' ? 'text-amber-300' : 'text-slate-300'} />
                                                        <div className="flex-1">
                                                            <p className="text-sm font-semibold">{item.label}</p>
                                                            {item.sub && <p className="text-xs text-slate-500">{item.sub}</p>}
                                                        </div>
                                                        {item.type === 'action' && <Sparkles size={14} className="text-primary-300" />}
                                                        {item.type === 'highlight' && <AlertTriangle size={16} className="text-amber-300" />}
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </header>

            <div className="mt-8 grid lg:grid-cols-3 gap-6">
                <section className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-slate-950/40 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Bulk Classification</p>
                            <h2 className="text-xl font-bold text-white">Upload & Process</h2>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <FileSpreadsheet size={16} />
                            .xlsx / .csv
                        </div>
                    </div>

                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={onDrop}
                        className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${dragActive ? 'border-primary-400 bg-primary-500/5' : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/40'}`}
                    >
                        <input
                            type="file"
                            accept=".xlsx,.csv"
                            className="hidden"
                            id="bulk-file-input"
                            onChange={(e) => handleFileUpload(e.target.files?.[0])}
                        />
                        <label htmlFor="bulk-file-input" className="flex flex-col items-center gap-3 text-slate-300">
                            <Workflow size={24} className="text-primary-300" />
                            <div>
                                <p className="font-semibold">Drag & Drop your dataset</p>
                                <p className="text-sm text-slate-500">or click to browse .xlsx / .csv</p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Clock3 size={14} />
                                {uploading ? 'Uploading...' : 'Typically under 10s for 1k rows'}
                            </div>
                        </label>
                    </div>

                    {errorMsg && (
                        <div className="mt-4 text-sm text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
                            {errorMsg}
                        </div>
                    )}

                    <div className="mt-6 bg-slate-950/40 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 flex items-center justify-between border-b border-slate-800">
                            <div className="flex items-center gap-2 text-slate-300">
                                <Brain size={16} className="text-primary-300" />
                                <span className="text-sm font-semibold">Results</span>
                            </div>
                            {uploading && <span className="text-xs text-slate-400">Processing...</span>}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm text-slate-200">
                                <thead className="bg-slate-900/70">
                                    <tr className="text-left">
                                        <th className="px-4 py-3 border-b border-slate-800">Question</th>
                                        <th className="px-4 py-3 border-b border-slate-800">Predicted Category</th>
                                        <th className="px-4 py-3 border-b border-slate-800">Confidence</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bulkResults.length === 0 && (
                                        <tr>
                                            <td className="px-4 py-4 text-slate-500" colSpan={3}>
                                                No results yet. Upload a file to see classifications.
                                            </td>
                                        </tr>
                                    )}
                                    {bulkResults.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                                            <td className="px-4 py-3 border-b border-slate-800 max-w-[320px] truncate" title={row.question}>{row.question}</td>
                                            <td className="px-4 py-3 border-b border-slate-800">
                                                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold">
                                                    {row.prediction}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 border-b border-slate-800">{row.confidence?.toFixed?.(1) || row.confidence || '--'}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                <section className="space-y-6">
                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-slate-950/40">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-slate-500">System Health</p>
                                <h3 className="text-lg font-bold text-white">Live Signals</h3>
                            </div>
                            <div className="flex items-center gap-2 text-emerald-300 text-sm">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                                </span>
                                API Online
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
                            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                                <div className="flex items-center gap-2 text-primary-200 text-xs font-semibold mb-1"><Activity size={14} />Latency</div>
                                <p className="text-white text-xl font-bold">120ms</p>
                                <p className="text-slate-500 text-xs">P95</p>
                            </div>
                            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                                <div className="flex items-center gap-2 text-primary-200 text-xs font-semibold mb-1"><ShieldCheck size={14} />Queue</div>
                                <p className="text-white text-xl font-bold">Stable</p>
                                <p className="text-slate-500 text-xs">No backlog</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl shadow-slate-950/40">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-slate-500">Database</p>
                                <h3 className="text-lg font-bold text-white">Classification History</h3>
                            </div>
                            <button
                                onClick={fetchHistory}
                                className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 text-slate-300"
                            >
                                Refresh
                            </button>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                            <HistoryIcon size={14} className="text-primary-300" />
                            Fetched from PostgreSQL backend
                        </div>
                        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                            {historyLoading && (
                                <div className="text-sm text-slate-500">Loading history...</div>
                            )}
                            {!historyLoading && history.length === 0 && (
                                <div className="text-sm text-slate-500">No history yet.</div>
                            )}
                            {!historyLoading && history.map((item, idx) => (
                                <div key={idx} className="p-3 rounded-xl border border-slate-800 bg-slate-950/40">
                                    <p className="text-sm text-slate-200 truncate" title={item.question}>{item.question}</p>
                                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-200">{item.topic}</span>
                                        <span className="text-primary-200 font-semibold">{item.confidence}%</span>
                                        <span className="text-slate-500">{item.username || 'user'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
