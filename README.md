# FundingFlow Dashboard

Dashboard de gestión de financiamiento para organizaciones del sector social. Centraliza el seguimiento de convocatorias, pipeline de propuestas y automatizaciones conectadas vía n8n.

## ¿Qué hace esta app?

Permite a equipos de cooperación internacional y ONG gestionar en tiempo real todo el ciclo de vida de una convocatoria de financiamiento, desde la detección hasta la aprobación o rechazo.

### 4 secciones principales

**📈 Resumen**
- Métricas clave: total pipeline, monto solicitado acumulado, convocatorias urgentes y tasa de éxito
- Alertas automáticas de convocatorias con fecha límite en los próximos 14 días (crítica ≤3d, pronto 4-14d)
- Gráfico de pipeline por estado (doughnut)
- Gráfico de urgencia por tramos (barras)

**🎯 Pipeline (Kanban)**
- Vista Kanban con 9 columnas de estado: En análisis, Elaboración, Concept Note, Propuesta completa, Enviada, Negociación, Aprobada, Rechazada, Archivada
- Tarjetas con código de color por urgencia (rojo = crítico, naranja = pronto)
- Click en tarjeta para seleccionarla y ejecutar una acción
- Panel de acciones: cambiar estado, asignar responsable, agregar comentario
- Cada acción dispara una notificación automática vía n8n (Telegram, Gmail, Slack)

**📋 Convocatorias (Tabla)**
- Tabla completa con todos los registros del pipeline
- Búsqueda en tiempo real por nombre, donante o ID
- Filtro por estado
- Columnas: ID, Nombre, Donante, Estado, Responsable, Fecha límite, Días restantes, Monto, Link

**⚙️ Flujos n8n**
- Vista de los 6 flujos de automatización activos que alimentan el dashboard

## Los 6 flujos n8n que conectan el sistema

| Flujo | Función | Frecuencia |
|-------|---------|-----------|
| 1 — Monitor RSS | Captura nuevas convocatorias de FundsForNGOs, TerraViva, Grant4EU | Cada 6 horas |
| 2 — Extracción IA | GPT-4o-mini extrae datos clave de cada convocatoria | Trigger: nuevos registros |
| 3 — Alertas | Envía alertas urgentes por Telegram, Slack y Gmail | Diario 9:00 AM |
| 4 — Pipeline | Procesa cambios de estado, responsable y comentarios desde el dashboard | Webhook + 8:00 AM |
| 5 — Reporte Semanal | Genera resumen IA y lo envía por email HTML y Telegram | Lunes 8:00 AM |
| 6 — API Dashboard | Sirve los datos al dashboard y recibe acciones POST | On demand |

## Arquitectura

```
Fuentes RSS (FundsForNGOs, TerraViva, Grant4EU)
  → Flujo 1 (n8n) — captura y deduplica
  → Flujo 2 (n8n + GPT-4o-mini) — extrae datos estructurados
  → Google Sheets — base de datos central
  → Flujo 6 (n8n) — API que sirve datos al dashboard
    → FundingFlow Dashboard (Next.js + Vercel)
      → Usuario ejecuta acción (cambio estado / asignar / comentario)
      → Flujo 4 (n8n) — procesa y notifica (Telegram / Gmail / Slack)
```

## Stack

- **Next.js 15** — frontend desplegado en Vercel
- **n8n** — motor de automatización (6 flujos activos)
- **OpenAI GPT-4o-mini** — extracción inteligente de datos de convocatorias
- **Google Sheets** — base de datos central del pipeline
- **Chart.js** — visualizaciones de datos
- **Telegram / Gmail / Slack** — notificaciones automáticas

## Requisitos para funcionar

El dashboard consume datos en tiempo real desde el **Flujo 6 de n8n**. Para que funcione correctamente:
- El webhook `dashboard-data` debe estar activo en n8n
- El webhook `dashboard-action` debe estar activo para recibir acciones
- Los datos se actualizan automáticamente cada 5 minutos

## Deploy en Vercel

1. Clona o fork este repo
2. Conecta en [vercel.com](https://vercel.com) → New Project → importa el repo
3. **No requiere variables de entorno** — se conecta directamente a los webhooks de n8n
4. Deploy

## Desarrollo local

```bash
npm install
npm run dev
# Abre http://localhost:3000
```

## Mejoras futuras (v2)

- **Autenticación** — login con roles (admin, gestor, visualizador) para proteger el acceso
- **Modo offline / demo** — datos de muestra cuando el webhook de n8n no está disponible
- **Notificaciones push** — alertas en el navegador sin necesidad de abrir la app
- **Formulario de nueva convocatoria** — registrar directamente desde el dashboard sin ir a Google Sheets
- **Historial de cambios** — log de todas las acciones realizadas por usuario y fecha
- **Exportar a PDF/Excel** — reporte del pipeline con un click
- **Integración con más fuentes** — ECHO, UNDP, Fondos UE directamente
- **IA conversacional** — chat para consultar el pipeline en lenguaje natural
- **KPIs avanzados** — tiempo promedio por fase, tasa de conversión por donante, proyección de ingresos

---

**Ignacio Briceño** 
Consultor de Desarrollo Social e Inteligencia Artifial
Portfolio de automatización e IA  
n8n + GPT-4o-mini + Next.js + Vercel · Sector social y cooperación internacional
