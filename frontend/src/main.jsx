import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8009'
const DEFAULT_PATH = '/Users/macbookair/coding/jev-music-tag/backend/media/红尘客栈.mp3'
const DEFAULT_QUESTIONS = {
  genre: { type: 'score', target_field: 'genre', instructions: '根据歌曲标题、艺术家、专辑和上下文判断最合适的音乐风格。', criteria: ['流行', '摇滚', '原声带', '电子', '民谣'] },
  language: { type: 'score', target_field: 'language', instructions: '根据歌词线索、标题和艺术家判断歌曲语言。', criteria: ['中文', '英文', '日文', '韩文', '其他'] },
}
const LABELS = { title: '标题', artist: '艺术家', lyrics: '歌词', genre: '风格', language: '语言' }
const ORDER = ['title', 'artist', 'lyrics', 'genre', 'language']

function formatValue(key, value) {
  if (value === null || value === undefined || value === '') return '未填写'
  if (key === 'duration') { const seconds = Number(value); return Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}` : value }
  if (key === 'bitrate') return `${Math.round(Number(value) / 1000)} kbps`
  if (key === 'sample_rate') return `${Number(value).toLocaleString()} Hz`
  if (Array.isArray(value)) return value.join(' / ')
  return String(value)
}

function App() {
  const [path, setPath] = useState(DEFAULT_PATH)
  const [metadata, setMetadata] = useState(null)
  const [suggestions, setSuggestions] = useState({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [reading, setReading] = useState(false)
  const [deciding, setDeciding] = useState(false)
  const [writing, setWriting] = useState(false)

  async function readMetadata() {
    setError(''); setMessage(''); setSuggestions({}); setReading(true)
    try {
      const response = await fetch(`${API}/api/read`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.detail || '读取失败')
      setMetadata(body.metadata); setMessage('音乐信息已读取')
    } catch (err) { setError(err.message || '暂时无法读取这首音乐') } finally { setReading(false) }
  }

  async function decide() {
    if (!metadata) return
    setError(''); setMessage(''); setDeciding(true)
    try {
      const response = await fetch(`${API}/api/decide`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ metadata, prompt: '请只根据提供的音乐信息做出谨慎判断，不确定时选择最保守的选项。', questions: DEFAULT_QUESTIONS }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.detail || 'Jev 暂时没有返回结果')
      setSuggestions(body.metadata_updates || {}); setMessage('建议已生成')
    } catch (err) { setError(err.message || '暂时无法完成判断') } finally { setDeciding(false) }
  }

  async function writeMetadata() {
    if (!metadata || !Object.keys(suggestions).length) return
    setError(''); setWriting(true)
    try {
      const response = await fetch(`${API}/api/write`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path, updates: suggestions }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.detail || '写回失败')
      setMetadata(body.metadata); setMessage('已写回音乐文件')
    } catch (err) { setError(err.message || '暂时无法写回文件') } finally { setWriting(false) }
  }

  const visibleFields = ORDER
  const hasSuggestions = Object.keys(suggestions).length > 0
  return <main className="shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">J</span><span>Jev Music Tag</span></div><span className="status-pill"><i /> 轻松整理音乐</span></header>
    <section className="hero"><span className="eyebrow">音乐信息整理</span><h1>让每一首歌，<em>更完整</em></h1><p>读取音乐信息，让 Jev 帮你补充合适的标签。</p></section>
    <section className="file-bar"><div className="file-copy"><span className="step">1</span><div><strong>找到一首音乐</strong><small>输入这台电脑上的音乐文件位置</small></div></div><div className="file-actions"><input value={path} onChange={e => setPath(e.target.value)} placeholder="例如：/Music/我的歌曲.flac" /><button onClick={readMetadata} disabled={!path || reading}>{reading ? '读取中…' : '读取音乐信息'}</button></div></section>
    {error && <div className="error">{error}</div>}{message && !error && <div className="message">{message}</div>}
    <section className="content-grid"><div className="metadata-section"><div className="section-title"><div><span className="step">2</span><h2>音乐信息</h2></div>{metadata && <span className="muted">{metadata.filename || '当前文件'}</span>}</div>{metadata ? <div className="metadata-card">{visibleFields.map(key => <div className={`metadata-item ${key === 'lyrics' ? 'lyrics-item' : ''} ${suggestions[key] ? 'suggested' : ''}`} key={key}><span>{LABELS[key]}</span><strong>{formatValue(key, suggestions[key] || metadata[key])}</strong>{suggestions[key] && <small>Jev 建议</small>}</div>)}</div> : <div className="empty-card"><div className="empty-icon">♫</div><strong>还没有读取音乐</strong><p>输入文件位置后，这里会显示清晰的音乐信息。</p></div>}</div>
      <aside className="decision-card"><div className="section-title"><div><span className="step">3</span><h2>智能整理</h2></div><span className="muted">Jev</span></div><div className="decision-copy"><div className="spark">✦</div><strong>{hasSuggestions ? '标签建议已准备好' : '让 Jev 看看这首歌'}</strong><p>{hasSuggestions ? '蓝色标记是建议补充或调整的内容。' : '它会根据歌曲现有信息，给出谨慎的标签建议。'}</p></div><button className="primary" onClick={decide} disabled={!metadata || deciding}>{deciding ? '判断中…' : '开始智能整理'}<span>↗</span></button>{hasSuggestions && <button className="secondary" onClick={writeMetadata} disabled={writing}>{writing ? '写回中…' : '写回音乐文件'}</button>}</aside>
    </section><footer><span>Jev Music Tag</span><span>你的音乐信息，只在本机处理</span></footer>
  </main>
}

createRoot(document.getElementById('root')).render(<App />)
