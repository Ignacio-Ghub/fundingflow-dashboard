import Head from 'next/head'
import { useEffect, useRef, useState } from 'react'

const API_URL = 'https://andrea-nuclio.app.n8n.cloud/webhook/dashboard-data'
const ACTION_URL = 'https://andrea-nuclio.app.n8n.cloud/webhook/dashboard-action'

function diasRestantes(fechaStr) {
  if (!fechaStr) return null
  try {
    let fecha
    const s = String(fechaStr).trim()
    if (s.includes('/')) { const [d,m,y] = s.split('/'); fecha = new Date(y,m-1,d) }
    else if (s.includes('-')) { fecha = new Date(s) }
    else return null
    if (isNaN(fecha)) return null
    const hoy = new Date(); hoy.setHours(0,0,0,0); fecha.setHours(0,0,0,0)
    return Math.round((fecha - hoy) / 86400000)
  } catch { return null }
}

function urgClass(dias) {
  if (dias === null || dias < 0) return 'none'
  if (dias <= 3) return 'critical'
  if (dias <= 14) return 'warning'
  return 'ok'
}

export default function Home() {
  const [tab, setTab] = useState('overview')
  const [data, setData] = useState([])
  const [lastUpdate, setLastUpdate] = useState('Cargando...')
  const [toasts, setToasts] = useState([])
  const [actionId, setActionId] = useState('')
  const [actionType, setActionType] = useState('')
  const [actionEstado, setActionEstado] = useState('')
  const [actionResponsable, setActionResponsable] = useState('')
  const [actionComentario, setActionComentario] = useState('')
  const [actionUsuario, setActionUsuario] = useState('dashboard')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const chartsRef = useRef({})
  const chartJsReady = useRef(false)

  function addToast(type, title, body) {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, title, body }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }

  async function loadData() {
    setLastUpdate('Actualizando...')
    try {
      const res = await fetch(API_URL + '?t=' + Date.now())
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const json = await res.json()
      if (!json.registros) throw new Error('Sin datos')
      const processed = json.registros.map(r => {
        const dias = diasRestantes(r.Fecha_Limite)
        return { ...r, _dias: dias, _urg: urgClass(dias) }
      })
      setData(processed)
      setLastUpdate(new Date().toLocaleString('es-ES'))
      addToast('success', 'Datos actualizados', processed.length + ' registros cargados')
    } catch (e) {
      setLastUpdate('Error')
      addToast('error', 'Error de conexión', 'Verifica que el Flujo 6 está activo: ' + e.message)
    }
  }

  useEffect(() => {
    loadData()
    const iv = setInterval(loadData, 5 * 60 * 1000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    if (tab !== 'overview' || data.length === 0) return
    const timer = setTimeout(() => drawCharts(), 200)
    return () => clearTimeout(timer)
  }, [tab, data])

  function drawCharts() {
    if (typeof window === 'undefined' || !window.Chart) return
    const Chart = window.Chart
    Object.values(chartsRef.current).forEach(c => { try { c.destroy() } catch {} })
    chartsRef.current = {}

    const ESTADOS = ['en_análisis','en_elaboración','concept_note','propuesta_completa','enviada','en_negociación','aprobada','rechazada','archivada']
    const LABELS  = ['En análisis','En elaboración','Concept Note','Propuesta','Enviada','Negociación','Aprobada','Rechazada','Archivada']
    const COLORS  = ['#1a7fd4','#d29922','#a371f7','#3fb950','#8b949e','#f0a500','#39d353','#f85149','#444c56']
    const nonZero = ESTADOS.map((e,i) => ({ label:LABELS[i], count:data.filter(r=>r.Estado===e).length, color:COLORS[i] })).filter(x=>x.count>0)

    const c1 = document.getElementById('chartEstados')
    const c2 = document.getElementById('chartUrgencia')
    if (c1 && nonZero.length) {
      chartsRef.current.estados = new Chart(c1, { type:'doughnut', data:{ labels:nonZero.map(x=>x.label), datasets:[{ data:nonZero.map(x=>x.count), backgroundColor:nonZero.map(x=>x.color), borderWidth:0 }]}, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'right', labels:{ color:'#8b949e', font:{ size:11 }}}}}})
    }
    if (c2) {
      const urg = { 'Crítica (≤3d)':data.filter(r=>r._urg==='critical').length, 'Pronto (4-14d)':data.filter(r=>r._urg==='warning').length, 'OK (>14d)':data.filter(r=>r._urg==='ok').length, 'Sin fecha':data.filter(r=>r._urg==='none').length }
      chartsRef.current.urg = new Chart(c2, { type:'bar', data:{ labels:Object.keys(urg), datasets:[{ data:Object.values(urg), backgroundColor:['#f85149','#d29922','#3fb950','#444c56'], borderWidth:0, borderRadius:6 }]}, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false }}, scales:{ y:{ beginAtZero:true, grid:{ color:'rgba(48,54,61,0.6)' }, ticks:{ color:'#8b949e', stepSize:1 }}, x:{ grid:{ display:false }, ticks:{ color:'#8b949e', font:{ size:11 }}}}}})
    }
  }

  async function enviarAccion() {
    if (!actionId) return addToast('error','Falta ID','Selecciona una tarjeta del Kanban')
    if (!actionType) return addToast('error','Falta acción','Selecciona qué quieres hacer')
    const payload = { action:actionType, convocatoria_id:actionId, usuario:actionUsuario||'dashboard' }
    if (actionType==='cambio_estado') { if (!actionEstado) return addToast('error','Falta estado','Selecciona el nuevo estado'); payload.nuevo_estado=actionEstado }
    if (actionType==='asignar') { if (!actionResponsable.trim()) return addToast('error','Falta responsable','Escribe el nombre'); payload.responsable=actionResponsable }
    if (actionType==='comentario') { if (!actionComentario.trim()) return addToast('error','Falta comentario','Escribe el comentario'); payload.comentario=actionComentario }
    setSending(true)
    try {
      const res = await fetch(ACTION_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) })
      const result = await res.json()
      if (result.success) {
        const msgs = { cambio_estado:'Estado → '+payload.nuevo_estado+' · Telegram ✅', asignar:'Asignado a '+payload.responsable+' · Gmail ✅', comentario:'Comentario guardado · Slack ✅' }
        addToast('success','Pipeline actualizado',msgs[actionType])
        setActionId(''); setActionType(''); setActionEstado(''); setActionResponsable(''); setActionComentario('')
        setTimeout(loadData, 1500)
      } else { addToast('error','Error',result.error||'Respuesta inesperada') }
    } catch { addToast('error','Error de conexión','Verifica que el Flujo 6 está activo') }
    finally { setSending(false) }
  }

  const total = data.length
  const urgentes = data.filter(r=>r._dias!==null&&r._dias>=0&&r._dias<=14).length
  const aprobadas = data.filter(r=>r.Estado==='aprobada').length
  const activos = data.filter(r=>['en_análisis','en_elaboración','concept_note','propuesta_completa'].includes(r.Estado)).length
  let montoTotal = 0
  data.forEach(r=>{ if(r.Monto_Solicitado){ const n=parseFloat(String(r.Monto_Solicitado).replace(/[^\d.]/g,'')); if(!isNaN(n)) montoTotal+=n }})

  const alertasUrgentes = [...data].filter(r=>r._dias!==null&&r._dias>=0&&r._dias<=14).sort((a,b)=>a._dias-b._dias)

  const ESTADOS_K = ['en_análisis','en_elaboración','concept_note','propuesta_completa','enviada','en_negociación','aprobada','rechazada','archivada']
  const LABELS_K  = { en_análisis:'📋 En Análisis', en_elaboración:'✏️ Elaboración', concept_note:'📝 Concept Note', propuesta_completa:'📄 Propuesta', enviada:'📤 Enviada', en_negociación:'🤝 Negociación', aprobada:'✅ Aprobada', rechazada:'❌ Rechazada', archivada:'📦 Archivada' }

  let tableData = [...data]
  if (search) tableData = tableData.filter(r=>(r.Nombre||'').toLowerCase().includes(search.toLowerCase())||(r.Donante||'').toLowerCase().includes(search.toLowerCase())||(r.ID_Convocatoria||'').toLowerCase().includes(search.toLowerCase()))
  if (filterEstado) tableData = tableData.filter(r=>r.Estado===filterEstado)

  const TABS = [['overview','📈 Resumen'],['pipeline','🎯 Pipeline'],['convocatorias','📋 Convocatorias'],['flujos','⚙️ Flujos']]

  return (
    <>
      <Head>
        <title>FundingFlow Dashboard</title>
        <meta name="description" content="Dashboard de gestión de convocatorias para el sector social. Powered by n8n + GPT-4o." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <script src="https://cdn.jsdelivr.net/npm/chart.js" defer></script>
      </Head>

      <style>{`
        :root{--bg:#0d1117;--surface:#161b22;--surface2:#1c2330;--border:#30363d;--accent:#1a7fd4;--accent2:#f0a500;--text:#e6edf3;--text2:#8b949e;--green:#3fb950;--red:#f85149;--orange:#d29922;--purple:#a371f7;--teal:#39d353;--radius:10px;--font:'DM Sans',sans-serif;--mono:'DM Mono',monospace}
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:var(--font);background:var(--bg);color:var(--text);min-height:100vh}
        .header{background:var(--surface);border-bottom:1px solid var(--border);padding:14px 28px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:100}
        .header-left{display:flex;align-items:center;gap:12px}
        .logo{font-size:19px;font-weight:700;letter-spacing:-.5px}
        .logo span{color:var(--accent2)}
        .badge-live{display:flex;align-items:center;gap:6px;background:rgba(63,185,80,.1);border:1px solid rgba(63,185,80,.25);border-radius:20px;padding:3px 10px;font-size:11px;color:var(--green);font-family:var(--mono)}
        .dot{width:6px;height:6px;background:var(--green);border-radius:50%;animation:blink 2s infinite}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        .header-right{display:flex;align-items:center;gap:12px}
        .btn-refresh{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:7px 14px;color:var(--text2);font-size:12px;font-family:var(--font);cursor:pointer;transition:all .2s}
        .btn-refresh:hover{border-color:var(--accent);color:var(--text)}
        .last-update{font-size:11px;color:var(--text2);font-family:var(--mono)}
        .tabs{background:var(--surface);border-bottom:1px solid var(--border);padding:0 28px;display:flex;gap:4px;overflow-x:auto}
        .tab{padding:12px 18px;cursor:pointer;border-bottom:2px solid transparent;font-size:13px;font-weight:500;color:var(--text2);transition:all .2s;white-space:nowrap;background:none;border-top:none;border-left:none;border-right:none;font-family:var(--font)}
        .tab:hover{color:var(--text)}
        .tab.active{color:var(--accent);border-bottom-color:var(--accent)}
        .content{padding:22px 28px;max-width:1400px;margin:0 auto}
        .metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:14px;margin-bottom:20px}
        .metric-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;transition:border-color .2s}
        .metric-card:hover{border-color:var(--accent)}
        .metric-label{font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px}
        .metric-value{font-size:28px;font-weight:700;font-family:var(--mono);color:var(--text)}
        .metric-sub{font-size:11px;margin-top:5px;color:var(--text2)}
        .metric-sub.green{color:var(--green)}
        .metric-sub.red{color:var(--red)}
        .section{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:18px;margin-bottom:18px}
        .section-title{font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.8px;margin-bottom:14px}
        .alert-item{display:flex;align-items:center;gap:12px;padding:10px 13px;border-radius:8px;margin-bottom:7px;border:1px solid transparent}
        .alert-item.critical{background:rgba(248,81,73,.07);border-color:rgba(248,81,73,.2)}
        .alert-item.warning{background:rgba(210,153,34,.07);border-color:rgba(210,153,34,.2)}
        .alert-item.ok{background:rgba(63,185,80,.07);border-color:rgba(63,185,80,.2)}
        .alert-info{flex:1;min-width:0}
        .alert-name{font-size:13px;font-weight:600;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .alert-meta{font-size:11px;color:var(--text2)}
        .alert-days{font-family:var(--mono);font-size:13px;font-weight:700;min-width:45px;text-align:right}
        .alert-days.critical{color:var(--red)}
        .alert-days.warning{color:var(--orange)}
        .alert-days.ok{color:var(--green)}
        .charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:16px;margin-bottom:18px}
        .chart-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:18px}
        .chart-title{font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.8px;margin-bottom:14px}
        .chart-container{position:relative;height:210px}
        .kanban{display:grid;grid-template-columns:repeat(auto-fit,minmax(195px,1fr));gap:13px;margin-bottom:18px}
        .kanban-col{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:13px;min-height:150px}
        .kanban-col-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:11px}
        .kanban-col-title{font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.6px}
        .kanban-count{background:var(--border);border-radius:10px;padding:2px 8px;font-size:11px;font-family:var(--mono)}
        .kanban-card{background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:10px;margin-bottom:8px;cursor:pointer;transition:all .15s}
        .kanban-card:hover{border-color:var(--accent);transform:translateY(-1px)}
        .kanban-card.urgent{border-left:3px solid var(--red)}
        .kanban-card.soon{border-left:3px solid var(--orange)}
        .kcard-id{font-size:10px;color:var(--text2);font-family:var(--mono);margin-bottom:4px}
        .kcard-name{font-size:12px;font-weight:600;margin-bottom:5px;line-height:1.3}
        .kcard-donor{font-size:11px;color:var(--text2);margin-bottom:5px}
        .kcard-footer{display:flex;justify-content:space-between;font-size:11px}
        .kcard-amount{color:var(--green);font-family:var(--mono)}
        .kcard-days{color:var(--text2)}
        .kcard-tip{font-size:10px;color:var(--accent);margin-top:5px}
        .action-panel{background:var(--surface);border:1px solid rgba(26,127,212,.35);border-radius:var(--radius);padding:18px;margin-bottom:18px}
        .action-panel .section-title{color:var(--accent);margin-bottom:16px}
        .action-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:11px;align-items:end}
        .form-group{display:flex;flex-direction:column;gap:5px}
        .form-label{font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:.8px;font-weight:600}
        .form-input,.form-select{background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:8px 11px;color:var(--text);font-family:var(--font);font-size:13px;transition:border-color .2s;outline:none;width:100%}
        .form-input:focus,.form-select:focus{border-color:var(--accent)}
        .form-select option{background:var(--surface2)}
        .btn-send{padding:9px 20px;border-radius:7px;border:none;background:var(--accent);color:white;font-family:var(--font);font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:7px;white-space:nowrap}
        .btn-send:hover{background:#1a6db5;transform:translateY(-1px)}
        .btn-send:disabled{background:var(--border);color:var(--text2);cursor:not-allowed;transform:none}
        .spinner-sm{width:13px;height:13px;border:2px solid rgba(255,255,255,.3);border-top-color:white;border-radius:50%;animation:spin .7s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .table-wrap{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:18px}
        .table-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px}
        .filters{display:flex;gap:8px;flex-wrap:wrap}
        .filter-input,.filter-select{background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:7px 11px;color:var(--text);font-size:12px;outline:none;font-family:var(--font);transition:border-color .2s}
        .filter-select option{background:var(--surface2)}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th{text-align:left;padding:9px 11px;color:var(--text2);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.7px;border-bottom:1px solid var(--border)}
        td{padding:11px 11px;border-bottom:1px solid rgba(48,54,61,.5);vertical-align:middle}
        tr:hover td{background:var(--surface2)}
        td a{color:var(--accent);text-decoration:none;font-size:11px}
        .badge{padding:3px 9px;border-radius:20px;font-size:10px;font-weight:600;font-family:var(--mono);white-space:nowrap}
        .badge.en_análisis{background:rgba(26,127,212,.15);color:#58a6ff}
        .badge.en_elaboración{background:rgba(210,153,34,.15);color:var(--orange)}
        .badge.concept_note{background:rgba(163,113,247,.15);color:var(--purple)}
        .badge.propuesta_completa{background:rgba(63,185,80,.15);color:var(--green)}
        .badge.enviada{background:rgba(139,148,158,.15);color:var(--text2)}
        .badge.en_negociación{background:rgba(240,165,0,.15);color:var(--accent2)}
        .badge.aprobada{background:rgba(57,211,83,.15);color:var(--teal)}
        .badge.rechazada{background:rgba(248,81,73,.15);color:var(--red)}
        .badge.archivada{background:rgba(48,54,61,.5);color:var(--text2)}
        .urg-dot{width:7px;height:7px;border-radius:50%;display:inline-block;margin-right:4px;vertical-align:middle}
        .urg-dot.critical{background:var(--red)}
        .urg-dot.warning{background:var(--orange)}
        .urg-dot.ok{background:var(--green)}
        .urg-dot.none{background:var(--border)}
        .flows-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px}
        .flow-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:17px}
        .flow-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
        .flow-name{font-size:13px;font-weight:600}
        .flow-dot{width:9px;height:9px;border-radius:50%;background:var(--green);box-shadow:0 0 6px var(--green)}
        .flow-stat{font-size:12px;color:var(--text2);margin-bottom:4px;font-family:var(--mono)}
        .toasts{position:fixed;bottom:22px;right:22px;z-index:999;display:flex;flex-direction:column;gap:8px}
        .toast{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:11px 14px;min-width:270px;max-width:360px;display:flex;align-items:flex-start;gap:9px;animation:toastIn .3s ease;box-shadow:0 8px 24px rgba(0,0,0,.5)}
        .toast.success{border-color:rgba(63,185,80,.5)}
        .toast.error{border-color:rgba(248,81,73,.5)}
        .toast.info{border-color:rgba(26,127,212,.5)}
        .toast-icon{font-size:15px;flex-shrink:0}
        .toast-title{font-size:13px;font-weight:600;margin-bottom:2px}
        .toast-body{font-size:11px;color:var(--text2)}
        @keyframes toastIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
        .empty{text-align:center;padding:40px 20px;color:var(--text2);font-size:13px}
        .loading-overlay{display:flex;align-items:center;justify-content:center;padding:60px;flex-direction:column;gap:14px;color:var(--text2)}
        .spinner-lg{width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite}
        @media(max-width:768px){.header{flex-direction:column;gap:10px}.content{padding:14px}.charts{grid-template-columns:1fr}.kanban{grid-template-columns:1fr 1fr}.action-grid{grid-template-columns:1fr}}
      `}</style>

      <div className="header">
        <div className="header-left">
          <div className="logo">Funding<span>Flow</span></div>
          <div className="badge-live"><div className="dot"/>EN VIVO</div>
        </div>
        <div className="header-right">
          <span className="last-update">{lastUpdate}</span>
          <button className="btn-refresh" onClick={loadData}>↻ Actualizar</button>
        </div>
      </div>

      <div className="tabs">
        {TABS.map(([id,label]) => (
          <button key={id} className={`tab${tab===id?' active':''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      <div className="content">

        {tab==='overview' && <>
          <div className="metrics">
            {data.length===0
              ? <div className="loading-overlay" style={{gridColumn:'1/-1'}}><div className="spinner-lg"/><span>Cargando...</span></div>
              : <>
                <div className="metric-card"><div className="metric-label">Total Pipeline</div><div className="metric-value">{total}</div><div className="metric-sub">{activos} en proceso activo</div></div>
                <div className="metric-card"><div className="metric-label">Monto Total</div><div className="metric-value" style={{fontSize:montoTotal>0?'18px':'28px'}}>{montoTotal>0?'€'+montoTotal.toLocaleString('es-ES'):'—'}</div><div className="metric-sub">Suma solicitada</div></div>
                <div className="metric-card"><div className="metric-label">Urgentes ≤14d</div><div className="metric-value">{urgentes}</div><div className={`metric-sub ${urgentes>0?'red':'green'}`}>{urgentes>0?'⚠️ Atención':'✅ Sin urgencias'}</div></div>
                <div className="metric-card"><div className="metric-label">Aprobadas</div><div className="metric-value" style={{color:'var(--green)'}}>{aprobadas}</div><div className="metric-sub green">{total>0?Math.round(aprobadas/total*100):0}% tasa éxito</div></div>
              </>
            }
          </div>
          <div className="section">
            <div className="section-title">⚠️ Alertas urgentes — próximas 2 semanas</div>
            {alertasUrgentes.length===0
              ? <div className="empty">✅ No hay convocatorias con fecha límite próxima</div>
              : alertasUrgentes.map(r => (
                <div key={r.ID_Convocatoria} className={`alert-item ${r._urg}`}>
                  <span>{r._urg==='critical'?'🔴':r._urg==='warning'?'🟡':'🟢'}</span>
                  <div className="alert-info">
                    <div className="alert-name">{r.Nombre||r.ID_Convocatoria}</div>
                    <div className="alert-meta">{r.Donante||'—'} · {r.Responsable||'Sin asignar'} · {r.Estado||'—'}</div>
                  </div>
                  <div className={`alert-days ${r._urg}`}>{r._dias}d</div>
                </div>
              ))
            }
          </div>
          <div className="charts">
            <div className="chart-card"><div className="chart-title">Pipeline por estado</div><div className="chart-container"><canvas id="chartEstados"/></div></div>
            <div className="chart-card"><div className="chart-title">Urgencia de convocatorias</div><div className="chart-container"><canvas id="chartUrgencia"/></div></div>
          </div>
        </>}

        {tab==='pipeline' && <>
          <div className="action-panel">
            <div className="section-title">⚡ Actualizar pipeline — notificación automática al guardar</div>
            <div className="action-grid">
              <div className="form-group">
                <label className="form-label">ID Convocatoria</label>
                <input type="text" className="form-input" value={actionId} onChange={e=>setActionId(e.target.value)} placeholder="Click en tarjeta Kanban" readOnly style={{cursor:'pointer'}}/>
              </div>
              <div className="form-group">
                <label className="form-label">Acción</label>
                <select className="form-select" value={actionType} onChange={e=>setActionType(e.target.value)}>
                  <option value="">— Selecciona —</option>
                  <option value="cambio_estado">🔄 Cambiar estado</option>
                  <option value="asignar">👤 Asignar responsable</option>
                  <option value="comentario">💬 Agregar comentario</option>
                </select>
              </div>
              {actionType==='cambio_estado' && <div className="form-group"><label className="form-label">Nuevo estado</label><select className="form-select" value={actionEstado} onChange={e=>setActionEstado(e.target.value)}><option value="">— Estado —</option>{['en_análisis','en_elaboración','concept_note','propuesta_completa','enviada','en_negociación','aprobada','rechazada','archivada'].map(e=><option key={e} value={e}>{e.replace(/_/g,' ')}</option>)}</select></div>}
              {actionType==='asignar' && <div className="form-group"><label className="form-label">Responsable</label><input type="text" className="form-input" value={actionResponsable} onChange={e=>setActionResponsable(e.target.value)} placeholder="Nombre completo"/></div>}
              {actionType==='comentario' && <div className="form-group"><label className="form-label">Comentario</label><input type="text" className="form-input" value={actionComentario} onChange={e=>setActionComentario(e.target.value)} placeholder="Escribe el comentario..."/></div>}
              <div className="form-group"><label className="form-label">Usuario</label><input type="text" className="form-input" value={actionUsuario} onChange={e=>setActionUsuario(e.target.value)} placeholder="Tu nombre"/></div>
              <div className="form-group" style={{justifyContent:'flex-end'}}><button className="btn-send" onClick={enviarAccion} disabled={sending}>{sending?<><div className="spinner-sm"/>Enviando...</>:'Enviar'}</button></div>
            </div>
          </div>
          <div className="kanban">
            {ESTADOS_K.map(estado => {
              const items = data.filter(r=>r.Estado===estado).sort((a,b)=>(a._dias||999)-(b._dias||999))
              return (
                <div key={estado} className="kanban-col">
                  <div className="kanban-col-header"><span className="kanban-col-title">{LABELS_K[estado]}</span><span className="kanban-count">{items.length}</span></div>
                  {items.length===0 ? <div style={{fontSize:'11px',color:'var(--text2)',textAlign:'center',padding:'12px 0'}}>Sin registros</div>
                    : items.map(r => {
                      const uc=r._urg==='critical'?'urgent':r._urg==='warning'?'soon':''
                      const dl=r._dias!==null&&r._dias>=0?'📅 '+r._dias+'d':r.Fecha_Limite?'⚠️ vencida':'sin fecha'
                      return <div key={r.ID_Convocatoria} className={`kanban-card ${uc}`} onClick={()=>{setActionId(r.ID_Convocatoria);addToast('info',r.ID_Convocatoria+' seleccionado','Elige la acción y completa los campos')}}><div className="kcard-id">{r.ID_Convocatoria}</div><div className="kcard-name">{r.Nombre||'—'}</div><div className="kcard-donor">🏛️ {r.Donante||'—'}</div><div className="kcard-footer"><span className="kcard-amount">{r.Monto_Solicitado||'—'}</span><span className="kcard-days">{dl}</span></div><div className="kcard-tip">Click para seleccionar →</div></div>
                    })
                  }
                </div>
              )
            })}
          </div>
        </>}

        {tab==='convocatorias' && (
          <div className="table-wrap">
            <div className="table-header">
              <div className="section-title" style={{margin:0}}>📋 Registros del pipeline</div>
              <div className="filters">
                <input type="text" className="filter-input" placeholder="🔍 Buscar..." value={search} onChange={e=>setSearch(e.target.value)}/>
                <select className="filter-select" value={filterEstado} onChange={e=>setFilterEstado(e.target.value)}>
                  <option value="">Todos los estados</option>
                  {['en_análisis','en_elaboración','concept_note','propuesta_completa','enviada','en_negociación','aprobada','rechazada','archivada'].map(e=><option key={e} value={e}>{e.replace(/_/g,' ')}</option>)}
                </select>
              </div>
            </div>
            {tableData.length===0 ? <div className="empty">Sin resultados</div>
              : <table><thead><tr><th>ID</th><th>Nombre</th><th>Donante</th><th>Estado</th><th>Responsable</th><th>Fecha límite</th><th>Días</th><th>Monto</th><th>Link</th></tr></thead>
                <tbody>{tableData.map(r=><tr key={r.ID_Convocatoria}><td style={{fontFamily:'var(--mono)',fontSize:'10px',color:'var(--text2)'}}>{r.ID_Convocatoria}</td><td><strong>{r.Nombre||'—'}</strong></td><td>{r.Donante||'—'}</td><td><span className={`badge ${r.Estado||''}`}>{(r.Estado||'—').replace(/_/g,' ')}</span></td><td>{r.Responsable||'—'}</td><td style={{fontFamily:'var(--mono)',fontSize:'11px'}}>{r.Fecha_Limite||'—'}</td><td><span className={`urg-dot ${r._urg}`}/>{r._dias!==null?(r._dias>=0?r._dias+'d':'Vencida'):'—'}</td><td style={{fontFamily:'var(--mono)',fontSize:'11px'}}>{r.Monto_Solicitado||'—'}</td><td>{r.Convocatoria_URL?<a href={r.Convocatoria_URL} target="_blank" rel="noreferrer">Ver →</a>:'—'}</td></tr>)}</tbody>
              </table>
            }
          </div>
        )}

        {tab==='flujos' && (
          <div className="flows-grid">
            {[['📡 Flujo 1 — Monitor RSS','Cada 6 horas','FundsForNGOs · TerraViva · Grant4EU','Captura y deduplica'],['🤖 Flujo 2 — Extracción IA','Trigger: nuevos registros','GPT-4o-mini','Extrae datos clave'],['🔔 Flujo 3 — Alertas','Diario 9:00 AM','Telegram · Slack · Gmail','Alertas urgentes'],['📋 Flujo 4 — Pipeline','Webhook + 8:00 AM','Estado · Responsable · Notas','Notifica cambios'],['📊 Flujo 5 — Reporte Semanal','Lunes 8:00 AM','Email HTML + Telegram','Resumen IA'],['🖥️ Flujo 6 — API Dashboard','On demand','GET datos · POST acciones','Sirve este dashboard']].map(([name,time,tools,status])=>(
              <div key={name} className="flow-card"><div className="flow-header"><span className="flow-name">{name}</span><div className="flow-dot"/></div><div className="flow-stat">⏱️ {time}</div><div className="flow-stat">🔗 {tools}</div><div className="flow-stat" style={{color:'var(--green)'}}>✅ {status}</div></div>
            ))}
          </div>
        )}

      </div>

      <div className="toasts">
        {toasts.map(t=>(
          <div key={t.id} className={`toast ${t.type}`}>
            <span className="toast-icon">{t.type==='success'?'✅':t.type==='error'?'❌':'💡'}</span>
            <div><div className="toast-title">{t.title}</div><div className="toast-body">{t.body}</div></div>
          </div>
        ))}
      </div>
    </>
  )
}
