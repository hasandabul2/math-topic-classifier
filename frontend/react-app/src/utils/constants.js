// Topic color mapping for badges and progress bars
export const TOPIC_COLORS = {
    'Algebra': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', bar: 'bg-blue-500', icon: 'x¹' },
    'Geometry and Trigonometry': { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', bar: 'bg-emerald-500', icon: '△' },
    'Calculus and Analysis': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', bar: 'bg-purple-500', icon: '∫' },
    'Probability and Statistics': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', bar: 'bg-amber-500', icon: '📊' },
    'Number Theory': { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', bar: 'bg-rose-500', icon: '#' },
    'Combinatorics and Discrete Math': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200', bar: 'bg-cyan-500', icon: '🎲' },
    'Linear Algebra': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', bar: 'bg-indigo-500', icon: '▦' },
    'Abstract Algebra and Topology': { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200', bar: 'bg-pink-500', icon: '∞' },
}

export const getTopicColor = (topic) => {
    return TOPIC_COLORS[topic] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', bar: 'bg-gray-500', icon: '?' }
}

export const SAMPLE_QUESTIONS = [
    "Solve the quadratic equation x² - 5x + 6 = 0",
    "Find the area of a triangle with vertices at (0,0), (3,4), and (-1,2)",
    "Calculate the derivative of f(x) = x³ - 3x² + 2x - 1",
    "What is the probability of rolling a sum of 8 with two dice?",
    "Find all prime numbers p such that p+2 is also prime",
    "In how many ways can a committee of 3 be chosen from 9 people?",
    "Find the eigenvalues of the matrix [[4,1],[6,-1]]",
    "Prove that every compact metric space is complete",
]
