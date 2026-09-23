import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const sampleMetadata = { title: '主角-《主角》电视剧主题曲', artist: '王菲', album: '主角', year: 2024 }
const sampleQuestions = { genre: { type: 'score', target_field: 'genre', instructions: '根据歌曲上下文判断最合适的风格。', criteria: ['Pop', 'Rock', 'Soundtrack'] } }

function App() {
  const [metadata, setMetadata] = useState(JSON.stringify(sampleMetadata, null, 2))
  const [questions, setQuestions] = useState(JSON.stringify(sampleQuestions, null, 2))
  const [prompt, setPrompt] = useState('请结合本地文件信息，谨慎做出可写入元数据的决定。')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function decide() {
    setError(''); setResult(null); setLoading(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/decide`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: JSON.parse(metadata), questions: JSON.parse(questions), prompt }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.detail || '请求失败')
      setResult(body)
    } catch (err) { setError(err.message || 'JSON 格式不正确') } finally { setLoading(false) }
  }

  return <main className="shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">J</span><span>Jev Music Tag</span></div><span className="status-pill"><i /> API workbench</span></header>
    <section className="intro"><div><span className="eyebrow">METADATA DECISION / 元数据决策</span><h1>让 Jev 帮你做<br /><em>更稳的标签判断</em></h1><p>把本地音乐信息交给结构化决策模型，得到可直接写回的元数据建议。</p></div><div className="intro-note"><span>01</span><strong>Review → decide → write</strong><small>只保留必要字段，结果清晰可复核。</small></div></section>
    <section className="workspace">
      <div className="panel input-panel"><div className="panel-head"><div><span className="step">01</span><h2>输入上下文</h2></div><span className="hint">JSON</span></div><label>本地元数据</label><textarea value={metadata} onChange={e => setMetadata(e.target.value)} spellCheck="false" /><label>决策提示</label><textarea className="prompt" value={prompt} onChange={e => setPrompt(e.target.value)} /><div className="panel-head question-head"><div><span className="step">02</span><h2>评分问题</h2></div><span className="hint">score only</span></div><textarea value={questions} onChange={e => setQuestions(e.target.value)} spellCheck="false" /></div>
      <div className="panel result-panel"><div className="panel-head"><div><span className="step">03</span><h2>决策结果</h2></div><span className="hint">Jev latest</span></div>{result ? <ResultView result={result} /> : <div className="empty"><div className="empty-icon">✦</div><strong>准备好做一次判断了吗？</strong><p>填写左侧上下文后，结果会显示在这里。</p></div>}<button className="decide-btn" onClick={decide} disabled={loading}>{loading ? '决策中…' : '运行 Jev 决策'}<span>↗</span></button>{error && <div className="error">{error}</div>}</div>
    </section><footer><span>Minimal interface for Jev-powered metadata decisions.</span><span>uv · FastAPI · React</span></footer>
  </main>
}

function ResultView({ result }) {
  const updates = result?.metadata_updates && typeof result.metadata_updates === 'object' ? result.metadata_updates : {}
  const answers = result?.answers && typeof result.answers === 'object' ? result.answers : {}
  return <>
    <div className="result-callout"><span>{Object.keys(updates).length ? '已生成可写入更新' : 'Jev 未生成字段更新'}</span><strong>{Object.keys(updates).length} fields</strong></div>
    <pre>{JSON.stringify(updates, null, 2)}</pre>
    <details><summary>查看原始回答</summary><pre>{JSON.stringify(answers, null, 2)}</pre></details>
  </>
}

createRoot(document.getElementById('root')).render(<App />)
