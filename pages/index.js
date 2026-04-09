import Head from 'next/head'
import { useEffect } from 'react'

export default function Home() {
  useEffect(() => {
    // Load Chart.js dynamically
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js'
    script.onload = () => initDashboard()
    document.head.appendChild(script)
    return () => { document.head.removeChild(script) }
  }, [])

  return (
    <>
      <Head>
        <title>FundingFlow Dashboard</title>
        <meta name="description" content="Dashboard de gestión de convocatorias de financiación para el sector social. Powered by n8n + GPT-4o." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        :root {
          --bg:#0d1117;--surface:#161b22;--surface2:#1c2330;--border:#30363d;
          --accent:#1a7fd4;--accent2:#f0a500;--text:#e6edf3;--text2:#8b949e;
          --green:#3fb950;--red:#f85149;--orange:#d29922;--purple:#a371f7;
          --teal:#39d353;--radius:10px;--font:'DM Sans',sans-serif;--mono:'DM Mono',monospace;
        }
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:var(--font);background:var(--bg);color:var(--text);min-height:100vh}
        .header{background:var(--surface);border-bottom:1px solid var(--border);padding:14px 28px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:100}
        .header-left{display:flex;align-items:center;gap:12px}
        .logo{font-size:19px;font-weight:700;letter-spacing:-0.5px}
        .logo span{color:var(--accent2)}
        .badge-live{display:flex;align-items:center;gap:6px;background:rgba(63,185,80,0.1);border:1px solid rgba(63,185,80,0.25);border-radius:20px;padding:3px 10px;font-size:11px;color:var(--green);font-family:var(--mono)}
        .dot{width:6px;height:6px;background:var(--green);border-radius:50%;animation:blink 2s infinite}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
        .header-right{display:flex;align-items:center;gap:12px}
        .btn-refresh{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:7px 14px;color:var(--text2);font-size:12px;font-family:var(--font);cursor:pointer;transition:all 0.2s}
        .btn-refresh:hover{border-color:var(--accent);color:var(--text)}
        .last-update{font-size:11px;color:var(--text2);font-family:var(--mono)}
        .tabs{background:var(--surface);border-bottom:1px solid var(--border);padding:0 28px;display:flex;gap:4px;overflow-x:auto}
        .tab{padding:12px 18px;cursor:pointer;border-bottom:2px solid transparent;font-size:13px;font-weight:500;color:var(--text2);transition:all 0.2s;white-space:nowrap}
        .tab:hover{color:var(--text)}
        .tab.active{color:var(--accent);border-bottom-color:var(--accent)}
        .content{padding:22px 28px;max-width:1400px;margin:0 auto}
        .tab-content{display:none}
        .tab-content.active{display:block;animation:fadeIn 0.2s ease}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .loading-overlay{display:flex;align-items:center;justify-content:center;padding:60px;flex-direction:column;gap:14px;color:var(--text2)}
        .spinner-lg{width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin 0.8s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}
        .metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:14px;margin-bottom:20px}
        .metric-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;transition:border-color 0.2s}
        .metric-card:hover{border-color:var(--accent)}
        .metric-label{font-size:11px;color:var(--text2);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px}
        .metric-value{font-size:28px;font-weight:700;font-family:var(--mono);color:var(--text)}
        .metric-sub{font-size:11px;margin-top:5px;color:var(--text2)}
        .metric-sub.green{color:var(--green)}
        .metric-sub.red{color:var(--red)}
        .section{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:18px;margin-bottom:18px}
        .section-title{font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:14px}
        .alert-item{display:flex;align-items:center;gap:12px;padding:10px 13px;border-radius:8px;margin-bottom:7px;border:1px solid transparent}
        .alert-item.critical{background:rgba(248,81,73,0.07);border-color:rgba(248,81,73,0.2)}
        .alert-item.warning{background:rgba(210,153,34,0.07);border-color:rgba(210,153,34,0.2)}
        .alert-item.ok{background:rgba(63,185,80,0.07);border-color:rgba(63,185,80,0.2)}
        .alert-info{flex:1;min-width:0}
        .alert-name{font-size:13px;font-weight:600;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .alert-meta{font-size:11px;color:var(--text2)}
        .alert-days{font-family:var(--mono);font-size:13px;font-weight:700;min-width:45px;text-align:right}
        .alert-days.critical{color:var(--red)}
        .alert-days.warning{color:var(--orange)}
        .alert-days.ok{color:var(--green)}
        .charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:16px;margin-bottom:18px}
        .chart-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:18px}
        .chart-title{font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:14px}
        .chart-container{position:relative;height:210px}
        .kanban{display:grid;grid-template-columns:repeat(auto-fit,minmax(195px,1fr));gap:13px;margin-bottom:18px}
        .kanban-col{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:13px;min-height:150px}
        .kanban-col-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:11px}
        .kanban-col-title{font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:0.6px}
        .kanban-count{background:var(--border);border-radius:10px;padding:2px 8px;font-size:11px;font-family:var(--mono)}
        .kanban-card{background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:10px;margin-bottom:8px;cursor:pointer;transition:all 0.15s}
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
        .action-panel{background:var(--surface);border:1px solid rgba(26,127,212,0.35);border-radius:var(--radius);padding:18px;margin-bottom:18px}
        .action-panel .section-title{color:var(--accent);margin-bottom:16px}
        .action-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:11px;align-items:end}
        .form-group{display:flex;flex-direction:column;gap:5px}
        .form-label{font-size:10px;color:var(--text2);text-transform:uppercase;letter-spacing:0.8px;font-weight:600}
        .form-input,.form-select{background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:8px 11px;color:var(--text);font-family:var(--font);font-size:13px;transition:border-color 0.2s;outline:none;width:100%}
        .form-input:focus,.form-select:focus{border-color:var(--accent)}
        .form-select option{background:var(--surface2)}
        .field-conditional{display:none}
        .field-conditional.show{display:flex;flex-direction:column;gap:5px}
        .btn-send{padding:9px 20px;border-radius:7px;border:none;background:var(--accent);color:white;font-family:var(--font);font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;gap:7px;white-space:nowrap}
        .btn-send:hover{background:#1a6db5;transform:translateY(-1px)}
        .btn-send:disabled{background:var(--border);color:var(--text2);cursor:not-allowed;transform:none}
        .spinner-sm{width:13px;height:13px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 0.7s linear infinite}
        .table-wrap{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:18px}
        .table-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px}
        .filters{display:flex;gap:8px;flex-wrap:wrap}
        .filter-input,.filter-select{background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:7px 11px;color:var(--text);font-size:12px;outline:none;font-family:var(--font);transition:border-color 0.2s}
        .filter-select option{background:var(--surface2)}
        table{width:100%;border-collapse:collapse;font-size:12px}
        th{text-align:left;padding:9px 11px;color:var(--text2);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.7px;border-bottom:1px solid var(--border)}
        td{padding:11px 11px;border-bottom:1px solid rgba(48,54,61,0.5);vertical-align:middle}
        tr:hover td{background:var(--surface2)}
        td a{color:var(--accent);text-decoration:none;font-size:11px}
        .badge{padding:3px 9px;border-radius:20px;font-size:10px;font-weight:600;font-family:var(--mono);white-space:nowrap}
        .badge.en_análisis{background:rgba(26,127,212,0.15);color:#58a6ff}
        .badge.en_elaboración{background:rgba(210,153,34,0.15);color:var(--orange)}
        .badge.concept_note{background:rgba(163,113,247,0.15);color:var(--purple)}
        .badge.propuesta_completa{background:rgba(63,185,80,0.15);color:var(--green)}
        .badge.enviada{background:rgba(139,148,158,0.15);color:var(--text2)}
        .badge.en_negociación{background:rgba(240,165,0,0.15);color:var(--accent2)}
        .badge.aprobada{background:rgba(57,211,83,0.15);color:var(--teal)}
        .badge.rechazada{background:rgba(248,81,73,0.15);color:var(--red)}
        .badge.archivada{background:rgba(48,54,61,0.5);color:var(--text2)}
        .urg-dot{width:7px;height:7px;border-radius:50%;display:inline-block;margin-right:4px;vertical-align:middle}
        .urg-dot.critical{background:var(--red)}
        .urg-dot.warning{background:var(--orange)}
        .urg-dot.ok{background:var(--green)}
        .urg-dot.none{background:var(--border)}
        .flows-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px}
        .flow-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:17px}
        .flow-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
        .flow-name{font-size:13px;font-weight:600}
        .flow-dot{width:9px;height:9px;border-radius:50%}
        .flow-dot.on{background:var(--green);box-shadow:0 0 6px var(--green)}
        .flow-stat{font-size:12px;color:var(--text2);margin-bottom:4px;font-family:var(--mono)}
        .toasts{position:fixed;bottom:22px;right:22px;z-index:999;display:flex;flex-direction:column;gap:8px}
        .toast{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:11px 14px;min-width:270px;max-width:360px;display:flex;align-items:flex-start;gap:9px;animation:toastIn 0.3s ease;box-shadow:0 8px 24px rgba(0,0,0,0.5)}
        .toast.success{border-color:rgba(63,185,80,0.5)}
        .toast.error{border-color:rgba(248,81,73,0.5)}
        .toast.info{border-color:rgba(26,127,212,0.5)}
        .toast-icon{font-size:15px;flex-shrink:0}
        .toast-title{font-size:13px;font-weight:600;margin-bottom:2px}
        .toast-body{font-size:11px;color:var(--text2)}
        @keyframes toastIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
        .empty{text-align:center;padding:40px 20px;color:var(--text2);font-size:13px}
        @media(max-width:768px){.header{flex-direction:column;gap:10px}.content{padding:14px}.charts{grid-template-columns:1fr}.kanban{grid-template-columns:1fr 1fr}.action-grid{grid-template-columns:1fr}}
      `}</style>

      <div className="header">
        <div className="header-left">
          <div className="logo">Funding<span>Flow</span></div>
          <div className="badge-live"><div className="dot"></div>EN VIVO</div>
        </div>
        <div className="header-right">
          <span className="last-update" id="lastUpdate">Cargando...</span>
          <button className="btn-refresh" onClick={() => window.loadData()}>↻ Actualizar</button>
        </div>
      </div>

      <div className="tabs">
        <div className="tab active" data-tab="overview">📈 Resumen</div>
        <div className="tab" data-tab="pipeline">🎯 Pipeline</div>
        <div className="tab" data-tab="convocatorias">📋 Convocatorias</div>
        <div className="tab" data-tab="flujos">⚙️ Flujos</div>
      </div>

      <div className="content">
        <div className="tab-content active" id="overview">
          <div className="metrics" id="metricsContainer">
            <div className="loading-overlay" style={{gridColumn:'1/-1'}}><div className="spinner-lg"></div><span>Cargando...</span></div>
          </div>
          <div className="section" id="alertsContainer">
            <div className="section-title">⚠️ Alertas urgentes</div>
            <div className="loading-overlay"><div className="spinner-lg"></div></div>
          </div>
          <div className="charts">
            <div className="chart-card"><div className="chart-title">Pipeline por estado</div><div className="chart-container"><canvas id="chartEstados"></canvas></div></div>
            <div className="chart-card"><div className="chart-title">Urgencia de convocatorias</div><div className="chart-container"><canvas id="chartUrgencia"></canvas></div></div>
          </div>
        </div>

        <div className="tab-content" id="pipeline">
          <div className="action-panel">
            <div className="section-title">⚡ Actualizar pipeline — notificación automática al guardar</div>
            <div className="action-grid">
              <div className="form-group">
                <label className="form-label">ID Convocatoria</label>
                <input type="text" className="form-input" id="actionId" placeholder="Click en tarjeta Kanban" readOnly style={{cursor:'pointer'}} />
              </div>
              <div className="form-group">
                <label className="form-label">Acción</label>
                <select className="form-select" id="actionType" onChange={() => window.toggleFields()}>
                  <option value="">— Selecciona —</option>
                  <option value="cambio_estado">🔄 Cambiar estado</option>
                  <option value="asignar">👤 Asignar responsable</option>
                  <option value="comentario">💬 Agregar comentario</option>
                </select>
              </div>
              <div className="form-group field-conditional" id="fieldEstado">
                <label className="form-label">Nuevo estado</label>
                <select className="form-select" id="actionEstado">
                  <option value="">— Estado —</option>
                  <option value="en_análisis">En análisis</option>
                  <option value="en_elaboración">En elaboración</option>
                  <option value="concept_note">Concept Note</option>
                  <option value="propuesta_completa">Propuesta completa</option>
                  <option value="enviada">Enviada</option>
                  <option value="en_negociación">En negociación</option>
                  <option value="aprobada">Aprobada</option>
                  <option value="rechazada">Rechazada</option>
                  <option value="archivada">Archivada</option>
                </select>
              </div>
              <div className="form-group field-conditional" id="fieldResponsable">
                <label className="form-label">Responsable</label>
                <input type="text" className="form-input" id="actionResponsable" placeholder="Nombre completo" />
              </div>
              <div className="form-group field-conditional" id="fieldComentario">
                <label className="form-label">Comentario</label>
                <input type="text" className="form-input" id="actionComentario" placeholder="Escribe el comentario..." />
              </div>
              <div className="form-group">
                <label className="form-label">Usuario</label>
                <input type="text" className="form-input" id="actionUsuario" placeholder="Tu nombre" defaultValue="dashboard" />
              </div>
              <div className="form-group" style={{justifyContent:'flex-end'}}>
                <button className="btn-send" id="btnSend" onClick={() => window.enviarAccion()}>
                  <span id="btnText">Enviar</span>
                </button>
              </div>
            </div>
          </div>
          <div id="kanbanContainer"><div className="loading-overlay"><div className="spinner-lg"></div><span>Cargando pipeline...</span></div></div>
        </div>

        <div className="tab-content" id="convocatorias">
          <div className="table-wrap">
            <div className="table-header">
              <div className="section-title" style={{margin:0}}>📋 Registros del pipeline</div>
              <div className="filters">
                <input type="text" className="filter-input" id="searchInput" placeholder="🔍 Buscar..." onInput={() => window.renderTable()} />
                <select className="filter-select" id="filterEstado" onChange={() => window.renderTable()}>
                  <option value="">Todos los estados</option>
                  <option value="en_análisis">En análisis</option>
                  <option value="en_elaboración">En elaboración</option>
                  <option value="concept_note">Concept Note</option>
                  <option value="propuesta_completa">Propuesta completa</option>
                  <option value="enviada">Enviada</option>
                  <option value="en_negociación">En negociación</option>
                  <option value="aprobada">Aprobada</option>
                  <option value="rechazada">Rechazada</option>
                  <option value="archivada">Archivada</option>
                </select>
              </div>
            </div>
            <div id="tableContainer"><div className="loading-overlay"><div className="spinner-lg"></div></div></div>
          </div>
        </div>

        <div className="tab-content" id="flujos">
          <div className="flows-grid">
            {[
              {name:'📡 Flujo 1 — Monitor RSS', stats:['⏱️ Cada 6 horas','🔗 FundsForNGOs · TerraViva · Grant4EU','✅ Captura y deduplica']},
              {name:'🤖 Flujo 2 — Extracción IA', stats:['⏱️ Trigger: nuevos registros','🧠 GPT-4o-mini','✅ Extrae datos clave']},
              {name:'🔔 Flujo 3 — Alertas', stats:['⏱️ Diario 9:00 AM','📣 Telegram · Slack · Gmail','✅ Alertas urgentes']},
              {name:'📋 Flujo 4 — Pipeline', stats:['⏱️ Webhook + 8:00 AM','🔄 Estado · Responsable · Notas','✅ Notifica cambios']},
              {name:'📊 Flujo 5 — Reporte Semanal', stats:['⏱️ Lunes 8:00 AM','📧 Email HTML + Telegram','✅ Resumen IA']},
              {name:'🖥️ Flujo 6 — API Dashboard', stats:['⏱️ On demand','🔗 GET datos · POST acciones','✅ Sirve este dashboard']},
            ].map((f,i) => (
              <div key={i} className="flow-card">
                <div className="flow-header">
                  <span className="flow-name">{f.name}</span>
                  <div className="flow-dot on"></div>
                </div>
                {f.stats.map((s,j) => <div key={j} className="flow-stat" style={j===2?{color:'var(--green)'}:{}}>{s}</div>)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="toasts" id="toastContainer"></div>

      <script dangerouslySetInnerHTML={{__html:`
        const API_URL = 'https://andrea-nuclio.app.n8n.cloud/webhook/dashboard-data';
        const ACTION_URL = 'https://andrea-nuclio.app.n8n.cloud/webhook/dashboard-action';
        let pipelineData = [];
        let charts = {};

        function diasRestantes(fechaStr) {
          if (!fechaStr) return null;
          try {
            let fecha;
            const s = String(fechaStr).trim();
            if (s.includes('/')) { const [d,m,y] = s.split('/'); fecha = new Date(y, m-1, d); }
            else if (s.includes('-')) { fecha = new Date(s); }
            else return null;
            if (isNaN(fecha)) return null;
            const hoy = new Date(); hoy.setHours(0,0,0,0); fecha.setHours(0,0,0,0);
            return Math.round((fecha - hoy) / 86400000);
          } catch { return null; }
        }

        function urgClass(dias) {
          if (dias === null || dias < 0) return 'none';
          if (dias <= 3) return 'critical';
          if (dias <= 14) return 'warning';
          return 'ok';
        }

        window.loadData = async function() {
          document.getElementById('lastUpdate').textContent = 'Actualizando...';
          try {
            const res = await fetch(API_URL + '?t=' + Date.now());
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const json = await res.json();
            if (!json.registros) throw new Error('Sin datos');
            pipelineData = json.registros.map(r => ({
              ...r,
              _dias: diasRestantes(r.Fecha_Limite),
              _urg: urgClass(diasRestantes(r.Fecha_Limite))
            }));
            renderAll();
            document.getElementById('lastUpdate').textContent = new Date().toLocaleString('es-ES');
            toast('success', 'Datos actualizados', pipelineData.length + ' registros cargados');
          } catch(e) {
            document.getElementById('lastUpdate').textContent = 'Error';
            toast('error', 'Error de conexión', 'Verifica que el Flujo 6 está activo: ' + e.message);
          }
        }

        function renderAll() { renderMetrics(); renderAlerts(); renderCharts(); renderKanban(); renderTable(); }

        function renderMetrics() {
          const total = pipelineData.length;
          const urgentes = pipelineData.filter(r => r._dias !== null && r._dias >= 0 && r._dias <= 14).length;
          const aprobadas = pipelineData.filter(r => r.Estado === 'aprobada').length;
          const activos = pipelineData.filter(r => ['en_análisis','en_elaboración','concept_note','propuesta_completa'].includes(r.Estado)).length;
          let montoTotal = 0;
          pipelineData.forEach(r => { if(r.Monto_Solicitado) { const n = parseFloat(String(r.Monto_Solicitado).replace(/[^\\d.]/g,'')); if(!isNaN(n)) montoTotal += n; } });
          document.getElementById('metricsContainer').innerHTML =
            '<div class="metric-card"><div class="metric-label">Total Pipeline</div><div class="metric-value">'+total+'</div><div class="metric-sub">'+activos+' en proceso activo</div></div>' +
            '<div class="metric-card"><div class="metric-label">Monto Total</div><div class="metric-value" style="font-size:'+(montoTotal>0?'18px':'28px')+'">'+(montoTotal>0?'€'+montoTotal.toLocaleString('es-ES'):'—')+'</div><div class="metric-sub">Suma solicitada</div></div>' +
            '<div class="metric-card"><div class="metric-label">Urgentes ≤14d</div><div class="metric-value">'+urgentes+'</div><div class="metric-sub '+(urgentes>0?'red':'green')+'">'+(urgentes>0?'⚠️ Atención':'✅ Sin urgencias')+'</div></div>' +
            '<div class="metric-card"><div class="metric-label">Aprobadas</div><div class="metric-value" style="color:var(--green)">'+aprobadas+'</div><div class="metric-sub green">'+(total>0?Math.round(aprobadas/total*100):0)+'% tasa éxito</div></div>';
        }

        function renderAlerts() {
          const urgentes = [...pipelineData].filter(r => r._dias !== null && r._dias >= 0 && r._dias <= 14).sort((a,b) => a._dias - b._dias);
          let html = '<div class="section-title">⚠️ Alertas urgentes — próximas 2 semanas</div>';
          if (!urgentes.length) { html += '<div class="empty">✅ No hay convocatorias con fecha límite próxima</div>'; }
          else { urgentes.forEach(r => { const icon = r._urg==='critical'?'🔴':r._urg==='warning'?'🟡':'🟢'; html += '<div class="alert-item '+r._urg+'"><span>'+icon+'</span><div class="alert-info"><div class="alert-name">'+(r.Nombre||r.ID_Convocatoria)+'</div><div class="alert-meta">'+(r.Donante||'—')+' · '+(r.Responsable||'Sin asignar')+' · '+(r.Estado||'—')+'</div></div><div class="alert-days '+r._urg+'">'+r._dias+'d</div></div>'; }); }
          document.getElementById('alertsContainer').innerHTML = html;
        }

        function renderCharts() {
          if (typeof Chart === 'undefined') return;
          Object.values(charts).forEach(c => c.destroy()); charts = {};
          const ESTADOS = ['en_análisis','en_elaboración','concept_note','propuesta_completa','enviada','en_negociación','aprobada','rechazada','archivada'];
          const LABELS = ['En análisis','En elaboración','Concept Note','Propuesta','Enviada','Negociación','Aprobada','Rechazada','Archivada'];
          const COLORS = ['#1a7fd4','#d29922','#a371f7','#3fb950','#8b949e','#f0a500','#39d353','#f85149','#444c56'];
          const counts = ESTADOS.map(e => pipelineData.filter(r => r.Estado===e).length);
          const nonZero = ESTADOS.map((e,i) => ({label:LABELS[i],count:counts[i],color:COLORS[i]})).filter(x => x.count>0);
          const c1 = document.getElementById('chartEstados');
          const c2 = document.getElementById('chartUrgencia');
          if (c1) charts.estados = new Chart(c1, { type:'doughnut', data:{ labels:nonZero.map(x=>x.label), datasets:[{data:nonZero.map(x=>x.count), backgroundColor:nonZero.map(x=>x.color), borderWidth:0}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{color:'#8b949e',font:{size:11}}}}}});
          const urg = {'Crítica (≤3d)':pipelineData.filter(r=>r._urg==='critical').length,'Pronto (4-14d)':pipelineData.filter(r=>r._urg==='warning').length,'OK (>14d)':pipelineData.filter(r=>r._urg==='ok').length,'Sin fecha':pipelineData.filter(r=>r._urg==='none').length};
          if (c2) charts.urg = new Chart(c2, { type:'bar', data:{labels:Object.keys(urg),datasets:[{data:Object.values(urg),backgroundColor:['#f85149','#d29922','#3fb950','#444c56'],borderWidth:0,borderRadius:6}]}, options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:'rgba(48,54,61,0.6)'},ticks:{color:'#8b949e',stepSize:1}},x:{grid:{display:false},ticks:{color:'#8b949e',font:{size:11}}}}}});
        }

        function renderKanban() {
          const ESTADOS = ['en_análisis','en_elaboración','concept_note','propuesta_completa','enviada','en_negociación','aprobada','rechazada','archivada'];
          const LABELS = {'en_análisis':'📋 En Análisis','en_elaboración':'✏️ Elaboración','concept_note':'📝 Concept Note','propuesta_completa':'📄 Propuesta','enviada':'📤 Enviada','en_negociación':'🤝 Negociación','aprobada':'✅ Aprobada','rechazada':'❌ Rechazada','archivada':'📦 Archivada'};
          let html = '<div class="kanban">';
          ESTADOS.forEach(estado => {
            const items = pipelineData.filter(r => r.Estado===estado);
            html += '<div class="kanban-col"><div class="kanban-col-header"><span class="kanban-col-title">'+LABELS[estado]+'</span><span class="kanban-count">'+items.length+'</span></div>';
            if (!items.length) { html += '<div style="font-size:11px;color:var(--text2);text-align:center;padding:12px 0">Sin registros</div>'; }
            else { items.sort((a,b)=>(a._dias||999)-(b._dias||999)).forEach(r => { const uc=r._urg==='critical'?'urgent':r._urg==='warning'?'soon':''; const diasLabel=r._dias!==null&&r._dias>=0?'📅 '+r._dias+'d':r.Fecha_Limite?'⚠️ vencida':'sin fecha'; html += '<div class="kanban-card '+uc+'" onclick="selectCard(\\''+r.ID_Convocatoria+'\\')"><div class="kcard-id">'+r.ID_Convocatoria+'</div><div class="kcard-name">'+(r.Nombre||'—')+'</div><div class="kcard-donor">🏛️ '+(r.Donante||'—')+'</div><div class="kcard-footer"><span class="kcard-amount">'+(r.Monto_Solicitado||'—')+'</span><span class="kcard-days">'+diasLabel+'</span></div><div class="kcard-tip">Click para seleccionar →</div></div>'; }); }
            html += '</div>';
          });
          html += '</div>';
          document.getElementById('kanbanContainer').innerHTML = html;
        }

        window.selectCard = function(id) {
          document.getElementById('actionId').value = id;
          document.querySelector('.action-panel').scrollIntoView({behavior:'smooth',block:'nearest'});
          toast('info', id+' seleccionado', 'Elige la acción y completa los campos');
        }

        window.renderTable = function() {
          const search = (document.getElementById('searchInput')?.value||'').toLowerCase();
          const filterE = document.getElementById('filterEstado')?.value||'';
          let data = [...pipelineData];
          if (search) data = data.filter(r => (r.Nombre||'').toLowerCase().includes(search)||(r.Donante||'').toLowerCase().includes(search)||(r.ID_Convocatoria||'').toLowerCase().includes(search));
          if (filterE) data = data.filter(r => r.Estado===filterE);
          if (!data.length) { document.getElementById('tableContainer').innerHTML='<div class="empty">Sin resultados</div>'; return; }
          let html = '<table><thead><tr><th>ID</th><th>Nombre</th><th>Donante</th><th>Estado</th><th>Responsable</th><th>Fecha límite</th><th>Días</th><th>Monto</th><th>Link</th></tr></thead><tbody>';
          data.forEach(r => { const diasTxt=r._dias!==null?(r._dias>=0?r._dias+'d':'Vencida'):'—'; html += '<tr><td style="font-family:var(--mono);font-size:10px;color:var(--text2)">'+r.ID_Convocatoria+'</td><td><strong>'+(r.Nombre||'—')+'</strong></td><td>'+(r.Donante||'—')+'</td><td><span class="badge '+(r.Estado||'')+'">'+(r.Estado||'—').replace(/_/g,' ')+'</span></td><td>'+(r.Responsable||'—')+'</td><td style="font-family:var(--mono);font-size:11px">'+(r.Fecha_Limite||'—')+'</td><td><span class="urg-dot '+r._urg+'"></span>'+diasTxt+'</td><td style="font-family:var(--mono);font-size:11px">'+(r.Monto_Solicitado||'—')+'</td><td>'+(r.Convocatoria_URL?'<a href="'+r.Convocatoria_URL+'" target="_blank">Ver →</a>':'—')+'</td></tr>'; });
          html += '</tbody></table>';
          document.getElementById('tableContainer').innerHTML = html;
        }

        window.toggleFields = function() {
          const action = document.getElementById('actionType').value;
          document.getElementById('fieldEstado').className = 'form-group field-conditional'+(action==='cambio_estado'?' show':'');
          document.getElementById('fieldResponsable').className = 'form-group field-conditional'+(action==='asignar'?' show':'');
          document.getElementById('fieldComentario').className = 'form-group field-conditional'+(action==='comentario'?' show':'');
        }

        window.enviarAccion = async function() {
          const id = document.getElementById('actionId').value.trim();
          const action = document.getElementById('actionType').value;
          const usuario = document.getElementById('actionUsuario').value.trim()||'dashboard';
          if (!id) return toast('error','Falta ID','Selecciona una tarjeta del Kanban');
          if (!action) return toast('error','Falta acción','Selecciona qué quieres hacer');
          const payload = {action, convocatoria_id:id, usuario};
          if (action==='cambio_estado') { const e=document.getElementById('actionEstado').value; if(!e) return toast('error','Falta estado','Selecciona el nuevo estado'); payload.nuevo_estado=e; }
          if (action==='asignar') { const r=document.getElementById('actionResponsable').value.trim(); if(!r) return toast('error','Falta responsable','Escribe el nombre'); payload.responsable=r; }
          if (action==='comentario') { const c=document.getElementById('actionComentario').value.trim(); if(!c) return toast('error','Falta comentario','Escribe el comentario'); payload.comentario=c; }
          const btn=document.getElementById('btnSend'); const btnText=document.getElementById('btnText');
          btn.disabled=true; btnText.innerHTML='<span class="spinner-sm"></span>';
          try {
            const res = await fetch(ACTION_URL, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
            const data = await res.json();
            if (data.success) {
              const msgs = {cambio_estado:'Estado → '+payload.nuevo_estado+' · Telegram ✅',asignar:'Asignado a '+payload.responsable+' · Gmail ✅',comentario:'Comentario guardado · Slack ✅'};
              toast('success','Pipeline actualizado',msgs[action]);
              document.getElementById('actionEstado').value=''; document.getElementById('actionResponsable').value=''; document.getElementById('actionComentario').value=''; document.getElementById('actionId').value=''; document.getElementById('actionType').value=''; window.toggleFields();
              setTimeout(window.loadData, 1500);
            } else { toast('error','Error',data.error||'Respuesta inesperada'); }
          } catch(e) { toast('error','Error de conexión','Verifica que el Flujo 6 está activo'); }
          finally { btn.disabled=false; btnText.textContent='Enviar'; }
        }

        function toast(type,title,body) {
          const icons={success:'✅',error:'❌',info:'💡'};
          const el=document.createElement('div'); el.className='toast '+type;
          el.innerHTML='<span class="toast-icon">'+icons[type]+'</span><div><div class="toast-title">'+title+'</div><div class="toast-body">'+body+'</div></div>';
          document.getElementById('toastContainer').appendChild(el);
          setTimeout(()=>el.remove(),4500);
        }

        document.querySelectorAll('.tab').forEach(tab => {
          tab.addEventListener('click',()=>{
            document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
            tab.classList.add('active'); document.getElementById(tab.dataset.tab).classList.add('active');
          });
        });

        window.loadData();
        setInterval(window.loadData, 5*60*1000);
      `}} />
    </>
  )
}
