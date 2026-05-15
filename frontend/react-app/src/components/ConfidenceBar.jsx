import { getTopicColor } from '../utils/constants'

export default function ConfidenceBar({ topic, confidence, rank = 1 }) {
    const colors = getTopicColor(topic)

    return (
        <div className="space-y-1.5" style={{ animationDelay: `${rank * 150}ms` }}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm">{colors.icon}</span>
                    <span className="text-sm font-medium text-slate-700">{topic}</span>
                </div>
                <span className={`text-sm font-bold ${colors.text}`}>{confidence.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full ${colors.bar} animate-fill`}
                    style={{ '--bar-width': `${confidence}%`, width: `${confidence}%` }}
                />
            </div>
        </div>
    )
}
