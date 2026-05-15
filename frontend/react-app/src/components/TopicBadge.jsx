import { getTopicColor } from '../utils/constants'

export default function TopicBadge({ topic, size = 'md' }) {
    const colors = getTopicColor(topic)

    const sizes = {
        sm: 'px-3 py-1 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
    }

    return (
        <span className={`inline-flex items-center gap-2 font-semibold rounded-full border ${colors.bg} ${colors.text} ${colors.border} ${sizes[size]}`}>
            <span className="text-base">{colors.icon}</span>
            {topic}
        </span>
    )
}
