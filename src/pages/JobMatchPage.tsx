// src/pages/JobMatchPage.tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import {
    Sparkles, ChevronRight, Loader2, AlertTriangle,
    CheckCircle2, XCircle, ArrowLeft, BookOpen,
    Zap, Target, TrendingUp, Clock, ArrowRight,
    CircleDot, Star, RotateCcw, Save, Download,
    Trash2, History, FileText, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn, formatDate } from '@/lib/utils'
import { useProfiles, type CandidateProfile } from '@/hooks/useProfiles'
import { useOpenRouter, OPENROUTER_URL } from '@/hooks/useOpenRouter'
import { useI18n } from '@/i18n'
import type { JobMatchRecord } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

interface MatchSkill {
    name: string
    level: 'fort' | 'partiel' | 'absent'
    comment: string
}

interface MatchAnalysis {
    score: number
    verdict: 'excellent' | 'bon' | 'moyen' | 'faible'
    summary: string
    strengths: string[]
    gaps: string[]
    skills: MatchSkill[]
    tips: string[]
}

interface RoadmapStep {
    title: string
    duration: string
    description: string
    ressources: { label: string; url: string }[]
}


// ── Storage hook ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'jat_job_matches'

function readMatches(): JobMatchRecord[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : []
    } catch { return [] }
}

function writeMatches(records: JobMatchRecord[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

let _matches: JobMatchRecord[] = readMatches()
let _matchListeners: Array<(r: JobMatchRecord[]) => void> = []

function emitMatches(next: JobMatchRecord[]) {
    _matches = next
    _matchListeners.forEach(l => l([..._matches]))
}

function useJobMatches() {
    const [matches, setMatches] = useState<JobMatchRecord[]>(_matches)

    useEffect(() => {
        const handler = (next: JobMatchRecord[]) => setMatches(next)
        _matchListeners.push(handler)

        function onStorage(e: StorageEvent) {
            if (e.key !== STORAGE_KEY) return
            const fresh = readMatches()
            _matches = fresh
            emitMatches([...fresh])
        }
        window.addEventListener('storage', onStorage)

        return () => {
            _matchListeners = _matchListeners.filter(l => l !== handler)
            window.removeEventListener('storage', onStorage)
        }
    }, [])

    const saveMatch = useCallback((record: Omit<JobMatchRecord, 'id' | 'createdAt'>): JobMatchRecord => {
        const created: JobMatchRecord = {
            ...record,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
        }
        const next = [created, ..._matches]
        writeMatches(next)
        emitMatches(next)
        return created
    }, [])

    const deleteMatch = useCallback((id: string) => {
        const next = _matches.filter(r => r.id !== id)
        writeMatches(next)
        emitMatches(next)
    }, [])

    return { matches, saveMatch, deleteMatch }
}

// ── Markdown export ───────────────────────────────────────────────────────────
// Remplace generateMarkdown + downloadMarkdown par cette fonction
function exportPDF(record: JobMatchRecord) {
    const { analysis, roadmap, profileName, jobOfferSnippet, createdAt } = record
    const date = new Date(createdAt).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric',
    })

    const verdictLabel = { excellent: 'Excellent', bon: 'Bon', moyen: 'Moyen', faible: 'Faible' }[analysis.verdict]
    const scoreColor = {
        excellent: '#059669', bon: '#2563eb', moyen: '#d97706', faible: '#dc2626',
    }[analysis.verdict]

    const levelIcon = { fort: '●', partiel: '◐', absent: '○' }
    const levelLabel = { fort: 'Maîtrisé', partiel: 'Partiel', absent: 'Absent' }
    const levelColor = { fort: '#059669', partiel: '#d97706', absent: '#dc2626' }

    const skillsRows = analysis.skills.map(s => `
        <tr>
            <td>${s.name}</td>
            <td style="color:${levelColor[s.level]};font-weight:600">
                <span style="margin-right:6px">${levelIcon[s.level]}</span>${levelLabel[s.level]}
            </td>
            <td style="color:#6b7280">${s.comment}</td>
        </tr>`).join('')

    const strengthsHTML = analysis.strengths.map(s =>
        `<li><span class="check">✓</span>${s}</li>`
    ).join('')

    const gapsHTML = analysis.gaps.length > 0
        ? analysis.gaps.map(g => `<li><span class="cross">✗</span>${g}</li>`).join('')
        : '<li style="color:#9ca3af;font-style:italic">Aucune lacune majeure identifiée.</li>'

    const tipsHTML = analysis.tips.map((t, i) =>
        `<li><span class="num">${i + 1}</span>${t}</li>`
    ).join('')

    const roadmapHTML = roadmap && roadmap.length > 0
        ? roadmap.map((step, i) => {
            const links = step.ressources?.length > 0
                ? `<div class="resources">${step.ressources.map(r =>
                    `<a href="${r.url}" target="_blank">${r.label}</a>`
                ).join('')}</div>`
                : ''
            return `
            <div class="roadmap-step">
                <div class="step-number">${i + 1}</div>
                <div class="step-body">
                    <div class="step-header">
                        <span class="step-title">${step.title}</span>
                        <span class="step-duration">⏱ ${step.duration}</span>
                    </div>
                    <p class="step-desc">${step.description}</p>
                    ${links}
                </div>
            </div>`
        }).join('')
        : ''

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Analyse matching — ${profileName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    font-size: 11pt;
    color: #111827;
    background: #fff;
    padding: 0;
  }

  /* ── Header band ── */
  .header {
    background: #111827;
    color: #fff;
    padding: 32px 48px 28px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .header-left h1 {
    font-size: 22pt;
    font-weight: 700;
    letter-spacing: -0.5px;
  }
  .header-left .subtitle {
    font-size: 10pt;
    color: #9ca3af;
    margin-top: 4px;
  }
  .score-badge {
    text-align: right;
  }
  .score-number {
    font-size: 42pt;
    font-weight: 800;
    line-height: 1;
    color: ${scoreColor};
  }
  .score-label {
    font-size: 10pt;
    color: #9ca3af;
    margin-top: 2px;
  }
  .score-verdict {
    font-size: 12pt;
    font-weight: 600;
    color: ${scoreColor};
  }

  /* ── Body ── */
  .body { padding: 36px 48px; }

  /* ── Summary ── */
  .summary {
    background: #f9fafb;
    border-left: 4px solid #e5e7eb;
    padding: 14px 18px;
    color: #374151;
    font-size: 10.5pt;
    line-height: 1.6;
    margin-bottom: 28px;
    border-radius: 0 6px 6px 0;
  }

  /* ── Section ── */
  .section { margin-bottom: 28px; }
  .section-title {
    font-size: 7pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #6b7280;
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid #f3f4f6;
  }

  /* ── Two-col grid ── */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 28px; }
  .col-card {
    background: #f9fafb;
    border-radius: 8px;
    padding: 16px;
  }
  .col-title {
    font-size: 7pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: #6b7280;
    margin-bottom: 10px;
  }
  ul.points { list-style: none; display: flex; flex-direction: column; gap: 7px; }
  ul.points li {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 10pt;
    color: #374151;
    line-height: 1.4;
  }
  .check { color: #059669; font-weight: 700; font-size: 11pt; margin-top: -1px; flex-shrink: 0; }
  .cross { color: #dc2626; font-weight: 700; font-size: 11pt; margin-top: -1px; flex-shrink: 0; }

  /* ── Skills table ── */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10pt;
  }
  thead tr {
    background: #f3f4f6;
  }
  th {
    text-align: left;
    padding: 8px 12px;
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #6b7280;
    border-bottom: 1px solid #e5e7eb;
  }
  td {
    padding: 9px 12px;
    border-bottom: 1px solid #f3f4f6;
    vertical-align: top;
    line-height: 1.4;
  }
  tr:last-child td { border-bottom: none; }
  tbody tr:hover { background: #fafafa; }

  /* ── Tips ── */
  ol.tips { list-style: none; display: flex; flex-direction: column; gap: 8px; }
  ol.tips li {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 10pt;
    color: #374151;
    line-height: 1.5;
  }
  .num {
    background: #111827;
    color: #fff;
    border-radius: 50%;
    width: 18px;
    height: 18px;
    font-size: 8pt;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }

  /* ── Roadmap ── */
  .roadmap-section {
    margin-top: 8px;
    page-break-before: always;
  }
  .roadmap-header {
    background: #111827;
    color: #fff;
    padding: 18px 24px;
    border-radius: 8px 8px 0 0;
    margin-bottom: 0;
  }
  .roadmap-header h2 {
    font-size: 13pt;
    font-weight: 700;
  }
  .roadmap-header p { font-size: 9pt; color: #9ca3af; margin-top: 3px; }
  .roadmap-steps {
    border: 1px solid #e5e7eb;
    border-top: none;
    border-radius: 0 0 8px 8px;
    overflow: hidden;
  }
  .roadmap-step {
    display: flex;
    gap: 0;
    border-bottom: 1px solid #f3f4f6;
  }
  .roadmap-step:last-child { border-bottom: none; }
  .step-number {
    background: #f9fafb;
    border-right: 1px solid #f3f4f6;
    min-width: 48px;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 18px;
    font-size: 16pt;
    font-weight: 800;
    color: #d1d5db;
  }
  .step-body { padding: 16px 20px; flex: 1; }
  .step-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
    flex-wrap: wrap;
  }
  .step-title {
    font-weight: 700;
    font-size: 11pt;
    color: #111827;
  }
  .step-duration {
    font-size: 8.5pt;
    color: #6b7280;
    background: #f3f4f6;
    padding: 2px 8px;
    border-radius: 20px;
  }
  .step-desc {
    font-size: 10pt;
    color: #4b5563;
    line-height: 1.55;
    margin-bottom: 10px;
  }
  .resources { display: flex; flex-wrap: wrap; gap: 6px; }
  .resources a {
    font-size: 8.5pt;
    color: #2563eb;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    padding: 2px 8px;
    border-radius: 4px;
    text-decoration: none;
  }

  /* ── Footer ── */
  .footer {
    margin-top: 40px;
    padding-top: 14px;
    border-top: 1px solid #f3f4f6;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 8pt;
    color: #9ca3af;
  }

  @media print {
    body { padding: 0; }
    .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .roadmap-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .score-number { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @page { margin: 0; size: A4; }
  }
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    <h1>Analyse de matching</h1>
    <div class="subtitle">${profileName} · ${date}</div>
  </div>
  <div class="score-badge">
    <div class="score-number">${analysis.score}</div>
    <div class="score-verdict">${verdictLabel}</div>
    <div class="score-label">score / 100</div>
  </div>
</div>

<div class="body">

  <div class="summary">${analysis.summary}</div>

  <div class="two-col">
    <div class="col-card">
      <div class="col-title">Points forts</div>
      <ul class="points">${strengthsHTML}</ul>
    </div>
    <div class="col-card">
      <div class="col-title">Lacunes identifiées</div>
      <ul class="points">${gapsHTML}</ul>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Compétences clés de l'offre</div>
    <table>
      <thead>
        <tr>
          <th style="width:28%">Compétence</th>
          <th style="width:18%">Niveau</th>
          <th>Analyse</th>
        </tr>
      </thead>
      <tbody>${skillsRows}</tbody>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Conseils pour candidater</div>
    <ol class="tips">${tipsHTML}</ol>
  </div>

  ${roadmapHTML ? `
  <div class="roadmap-section">
    <div class="roadmap-header">
      <h2>Plan de montée en compétences</h2>
      <p>${(roadmap?.length ?? 0)} étape${(roadmap?.length ?? 0) > 1 ? 's' : ''} pour renforcer ton profil</p>
    </div>
    <div class="roadmap-steps">${roadmapHTML}</div>
  </div>` : ''}

  <div class="footer">
    <span>Offre analysée : ${jobOfferSnippet}</span>
    <span>JAT — Job Application Tracker</span>
  </div>

</div>

<script>window.onload = () => { window.print(); }</script>
</body>
</html>`

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
}


// ── Prompts ───────────────────────────────────────────────────────────────────

function buildAnalysisPrompt(profile: CandidateProfile, jobOffer: string): string {
    const experiences = profile.experiences.map(e => {
        const period = e.endDate ? `${e.startDate} -> ${e.endDate}` : `${e.startDate} -> en cours`
        return `  [${e.type === 'pro' ? 'Pro' : 'Perso'}] ${e.title} @ ${e.organization} (${period})\n  ${e.description}`
    }).join('\n')

    return `Tu es un expert en recrutement tech et RH. Analyse l'adéquation entre ce profil candidat et cette offre d'emploi.

--- PROFIL CANDIDAT ---
Prénom / Nom : ${profile.firstName} ${profile.lastName}
Compétences : ${profile.skills || 'non renseignées'}
Diplômes : ${profile.degrees || 'non renseignés'}
Expériences :
${experiences || 'aucune'}

--- OFFRE D'EMPLOI ---
${jobOffer}

--- INSTRUCTIONS ---
Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans backticks, sans texte avant ou après.

Format JSON exact :
{
  "score": <entier 0-100>,
  "verdict": <"excellent" | "bon" | "moyen" | "faible">,
  "summary": "<2-3 phrases résumant l'adéquation globale>",
  "strengths": ["<point fort 1>", ...],
  "gaps": ["<manque important 1>", ...],
  "skills": [
    {
      "name": "<compétence ou critère clé de l'offre>",
      "level": <"fort" | "partiel" | "absent">,
      "comment": "<explication courte et honnête>"
    }
  ],
  "tips": ["<conseil actionnable 1>", "<conseil 2>"]
}

Règles :
- score : honnête, pas complaisant
- skills : les 5-8 compétences/critères les plus importants de l'offre
- strengths : 2-5 vrais points forts pour CE poste
- gaps : uniquement les manques réels et importants
- tips : 2-3 conseils pour la candidature (CV, lettre, entretien)`
}

function buildRoadmapPrompt(
    profile: CandidateProfile,
    jobOffer: string,
    skillsToImprove: MatchSkill[]
): string {
    const skillsList = skillsToImprove
        .map(s => `- ${s.name} (niveau actuel : ${s.level === 'partiel' ? 'partiel' : 'absent'}) : ${s.comment}`)
        .join('\n')

    return `Tu es un expert en formation et montée en compétences tech. Crée une roadmap personnalisée et concrète.

--- CONTEXTE ---
Candidat : ${profile.firstName} ${profile.lastName}
Compétences actuelles : ${profile.skills || 'non renseignées'}

--- OFFRE CIBLÉE ---
${jobOffer.slice(0, 800)}${jobOffer.length > 800 ? '...' : ''}

--- COMPÉTENCES A DÉVELOPPER ---
${skillsList}

--- INSTRUCTIONS ---
Réponds UNIQUEMENT avec un tableau JSON valide, sans markdown, sans backticks, sans texte avant ou après.

Format JSON exact :
[
  {
    "title": "<titre concis de l'étape>",
    "duration": "<durée réaliste ex: 2-3 semaines>",
    "description": "<ce qu'il faut faire concrètement, pourquoi, comment mesurer la progression>",
    "ressources": [
      { "label": "<nom affiché>", "url": "<URL directe et réelle>" }
    ]
  }
]

Règles :
- 3-6 étapes ordonnées logiquement (du plus fondamental au plus avancé)
- Chaque étape cible une ou plusieurs compétences manquantes
- Durées réalistes pour quelqu'un qui travaille ou étudie en parallèle
- ressources : URLs directes et vérifiables (ex: "https://react.dev", "https://developer.mozilla.org/...", "https://roadmap.sh/..."). Maximum 3 ressources par étape.`
}

// ── Score ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, verdict }: { score: number; verdict: MatchAnalysis['verdict'] }) {
    const r = 52
    const circ = 2 * Math.PI * r
    const offset = circ * (1 - score / 100)

    const colors = {
        excellent: { stroke: '#10b981', text: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40', label: 'Excellent' },
        bon:       { stroke: '#3b82f6', text: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-950/40',       label: 'Bon'       },
        moyen:     { stroke: '#f59e0b', text: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-950/40',     label: 'Moyen'     },
        faible:    { stroke: '#f87171', text: 'text-red-400',     bg: 'bg-red-50 dark:bg-red-950/40',         label: 'Faible'    },
    }
    const c = colors[verdict]

    return (
        <div className={cn('flex items-center gap-5 p-5 rounded-2xl border border-border', c.bg)}>
            <div className="relative shrink-0">
                <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
                    <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor"
                            className="text-border" strokeWidth="10" />
                    <circle cx="60" cy="60" r={r} fill="none" stroke={c.stroke}
                            strokeWidth="10" strokeLinecap="round"
                            strokeDasharray={`${circ}`}
                            strokeDashoffset={offset}
                            style={{ transition: 'stroke-dashoffset 1s ease' }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={cn('font-display text-3xl leading-none', c.text)}>{score}</span>
                    <span className="text-[10px] text-muted-foreground font-mono mt-0.5">/ 100</span>
                </div>
            </div>
            <div className="flex flex-col gap-1">
                <span className={cn('text-2xl font-display', c.text)}>{c.label}</span>
                <span className="text-xs text-muted-foreground">Score d'adéquation</span>
                <div className={cn(
                    'inline-flex items-center gap-1.5 mt-1 text-xs font-medium px-2 py-1 rounded-full w-fit border',
                    c.text, c.bg,
                )}>
                    {score >= 80
                        ? <><CheckCircle2 className="h-3.5 w-3.5" /> Candidature recommandée</>
                        : score >= 60
                            ? <><AlertTriangle className="h-3.5 w-3.5" /> Candidature possible</>
                            : <><XCircle className="h-3.5 w-3.5" /> Profil à renforcer</>
                    }
                </div>
            </div>
        </div>
    )
}

// ── Skill pill ────────────────────────────────────────────────────────────────

function SkillPill({ skill }: { skill: MatchSkill }) {
    const styles = {
        fort:    { dot: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300' },
        partiel: { dot: 'bg-amber-500',   bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',         text: 'text-amber-700 dark:text-amber-300'   },
        absent:  { dot: 'bg-red-400',     bg: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800',                 text: 'text-red-600 dark:text-red-400'       },
    }
    const s = styles[skill.level]
    const labels = { fort: 'Maîtrisé', partiel: 'Partiel', absent: 'Absent' }

    return (
        <div className={cn('flex items-start gap-3 p-3 rounded-xl border text-sm', s.bg)}>
            <span className={cn('h-2 w-2 rounded-full shrink-0 mt-1.5', s.dot)} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">{skill.name}</span>
                    <span className={cn('text-[10px] font-mono px-1.5 py-0.5 rounded-full border', s.bg, s.text)}>
                        {labels[skill.level]}
                    </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{skill.comment}</p>
            </div>
        </div>
    )
}

// ── Roadmap step (accordéon) ──────────────────────────────────────────────────

function RoadmapStepCard({ step, index, total }: { step: RoadmapStep; index: number; total: number }) {
    const [open, setOpen] = useState(false)

    return (
        <div className="flex gap-4">
            <div className="flex flex-col items-center shrink-0">
                <div className="h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center text-sm font-display shrink-0">
                    {index + 1}
                </div>
                {index < total - 1 && <div className="w-px flex-1 bg-border mt-2" />}
            </div>

            <div className={cn('flex-1 min-w-0', index < total - 1 ? 'pb-5' : 'pb-0')}>
                <button
                    type="button"
                    onClick={() => setOpen(o => !o)}
                    className="flex items-center justify-between w-full gap-2 text-left group"
                >
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm text-foreground group-hover:text-foreground/80 transition-colors">
                            {step.title}
                        </h4>
                        <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            <Clock className="h-2.5 w-2.5" />
                            {step.duration}
                        </span>
                    </div>
                    <ChevronRight className={cn(
                        'h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200',
                        open && 'rotate-90'
                    )} />
                </button>

                {open && (
                    <div className="flex flex-col gap-3 mt-3 animate-slide-up">
                        <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                        {step.ressources?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                                {step.ressources.map((r, i) => (
                                    <a
                                        key={i}
                                        href={r.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-[11px] bg-accent text-accent-foreground px-2 py-0.5 rounded-md border border-border hover:bg-foreground hover:text-background hover:border-foreground transition-colors"
                                    >
                                        <BookOpen className="h-2.5 w-2.5 shrink-0" />
                                        {r.label}
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Roadmap loading skeleton ──────────────────────────────────────────────────

function RoadmapLoading() {
    return (
        <div className="flex flex-col gap-4 bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-foreground">Génération de la roadmap…</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Calcul d'un plan personnalisé basé sur les compétences manquantes
                    </p>
                </div>
            </div>
            <div className="flex flex-col gap-4 mt-1 animate-pulse">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-4">
                        <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
                        <div className="flex-1 flex flex-col gap-2 pt-1">
                            <div className="h-3 bg-muted rounded w-2/5" />
                            <div className="h-2 bg-muted rounded w-full" />
                            <div className="h-2 bg-muted rounded w-3/4" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ── History card ──────────────────────────────────────────────────────────────

function HistoryCard({
                         record,
                         onClick,
                         onDelete,
                     }: {
    record: JobMatchRecord
    onClick: () => void
    onDelete: (e: React.MouseEvent) => void
}) {
    const { t } = useI18n()
    const verdictColors = {
        excellent: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
        bon:       'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
        moyen:     'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
        faible:    'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800',
    }

    return (
        <button
            onClick={onClick}
            className="group text-left bg-card border border-border rounded-xl p-4 hover:border-foreground/20 hover:shadow-sm transition-all flex flex-col gap-3 relative"
        >
            <div
                role="button"
                tabIndex={0}
                onClick={onDelete}
                onKeyDown={e => e.key === 'Enter' && onDelete(e as any)}
                className="absolute top-3 right-3 h-6 w-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
            >
                <Trash2 className="h-3 w-3" />
            </div>

            <div className="flex items-start gap-3 pr-6">
                <div className={cn(
                    'font-display text-2xl shrink-0 leading-none px-2 py-1 rounded-lg border',
                    verdictColors[record.analysis.verdict]
                )}>
                    {record.analysis.score}
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{record.profileName}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{record.jobOfferSnippet}</p>
                </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground/60">
                <span>{formatDate(record.createdAt.split('T')[0], t.intlLocale)}</span>
                {record.roadmap && record.roadmap.length > 0 && (
                    <>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                            <TrendingUp className="h-2.5 w-2.5" />
                            {record.roadmap.length} étapes
                        </span>
                    </>
                )}
            </div>
        </button>
    )
}

// ── Analysis result view ──────────────────────────────────────────────────────

function AnalysisView({
                          analysis,
                          roadmap,
                          roadmapError,
                          pageState,
                          profile,
                          onSave,
                          onExport,
                          onReset,
                          alreadySaved,
                      }: {
    analysis: MatchAnalysis
    roadmap: RoadmapStep[] | null
    roadmapError: string
    pageState: PageState
    profile: CandidateProfile | null
    onSave: () => void
    onExport: () => void
    onReset: () => void
    alreadySaved: boolean
}) {
    const skillsToImprove = analysis.skills.filter(s => s.level !== 'fort')
    const needsRoadmap = skillsToImprove.length > 0

    return (
        <div className="max-w-2xl flex flex-col gap-6 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onReset}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="h-3.5 w-3.5" /> Retour
                </button>
                <div className="flex items-center gap-2">
                    {pageState === 'done' && (
                        <>
                            <Button variant="outline" size="sm" onClick={onExport}>
                                <Download className="h-3.5 w-3.5" /> Exporter (.md)
                            </Button>
                            {!alreadySaved && (
                                <Button size="sm" onClick={onSave}>
                                    <Save className="h-3.5 w-3.5" /> Sauvegarder
                                </Button>
                            )}
                            {alreadySaved && (
                                <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Sauvegardé
                                </span>
                            )}
                        </>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                        <CircleDot className="h-3 w-3" />
                        {profile?.firstName} {profile?.lastName}
                    </div>
                </div>
            </div>

            {/* Score */}
            <ScoreRing score={analysis.score} verdict={analysis.verdict} />

            {/* Summary */}
            <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-border pl-4">
                {analysis.summary}
            </p>

            {/* Strengths + Gaps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {analysis.strengths?.length > 0 && (
                    <div className="flex flex-col gap-3 bg-card border border-border rounded-xl p-4">
                        <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0">
                                <Star className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Points forts</h3>
                        </div>
                        <ul className="flex flex-col gap-2">
                            {analysis.strengths.map((s, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                    <span className="text-foreground/80 leading-snug">{s}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {analysis.gaps?.length > 0 && (
                    <div className="flex flex-col gap-3 bg-card border border-border rounded-xl p-4">
                        <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-red-100 dark:bg-red-950/40 flex items-center justify-center shrink-0">
                                <Target className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                            </div>
                            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Lacunes</h3>
                        </div>
                        <ul className="flex flex-col gap-2">
                            {analysis.gaps.map((g, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                    <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                                    <span className="text-foreground/80 leading-snug">{g}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Skills breakdown */}
            {analysis.skills?.length > 0 && (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                            Compétences clés de l'offre
                        </h3>
                    </div>
                    <div className="flex flex-col gap-2">
                        {analysis.skills.map((skill, i) => (
                            <SkillPill key={i} skill={skill} />
                        ))}
                    </div>
                </div>
            )}

            {/* Tips */}
            {analysis.tips?.length > 0 && (
                <div className="flex flex-col gap-3 bg-muted/40 rounded-xl p-4 border border-border">
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5" /> Conseils pour candidater
                    </h3>
                    <ul className="flex flex-col gap-2">
                        {analysis.tips.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                <span className="text-foreground/80 leading-snug">{tip}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* ── PARTIE 2 : ROADMAP ── */}
            {needsRoadmap && (
                <>
                    <div className="flex items-center gap-3 py-2">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest shrink-0">
                            Roadmap
                        </span>
                        <div className="flex-1 h-px bg-border" />
                    </div>

                    {pageState === 'loading-roadmap' && <RoadmapLoading />}

                    {pageState === 'done' && roadmapError && (
                        <div className="flex items-start gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-xs text-destructive">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>{roadmapError}</span>
                        </div>
                    )}

                    {pageState === 'done' && roadmap && roadmap.length > 0 && (
                        <div className="flex flex-col gap-4 bg-card border border-border rounded-xl p-5">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-foreground flex items-center justify-center shrink-0">
                                    <TrendingUp className="h-4 w-4 text-background" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Plan de montée en compétences
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {skillsToImprove.length} compétence{skillsToImprove.length > 1 ? 's' : ''} à développer
                                        {' · '}{roadmap.length} étape{roadmap.length > 1 ? 's' : ''} — cliquez pour déplier
                                    </p>
                                </div>
                            </div>
                            <div className="mt-2">
                                {roadmap.map((step, i) => (
                                    <RoadmapStepCard key={i} step={step} index={i} total={roadmap.length} />
                                ))}
                            </div>
                        </div>
                    )}

                    {pageState === 'done' && (!roadmap || roadmap.length === 0) && !roadmapError && (
                        <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-sm text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="h-5 w-5 shrink-0" />
                            <span>Profil solide — aucune étape de formation prioritaire identifiée.</span>
                        </div>
                    )}
                </>
            )}

            {pageState === 'done' && (
                <Button variant="outline" size="sm" onClick={onReset} className="self-start">
                    <RotateCcw className="h-3.5 w-3.5" /> Analyser une autre offre
                </Button>
            )}
        </div>
    )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type PageState = 'form' | 'loading-analysis' | 'loading-roadmap' | 'done'
type View = 'form' | 'result' | 'history' | 'history-detail'

export function JobMatchPage() {
    const { profiles } = useProfiles()
    const { getApiKey, selectedModel, hasKey } = useOpenRouter()
    const { matches, saveMatch, deleteMatch } = useJobMatches()

    const [view, setView] = useState<View>('form')
    const [pageState, setPageState] = useState<PageState>('form')
    const [selectedProfileId, setSelectedProfileId] = useState('')
    const [jobOffer, setJobOffer] = useState('')

    const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null)
    const [roadmap, setRoadmap] = useState<RoadmapStep[] | null>(null)
    const [roadmapError, setRoadmapError] = useState('')
    const [error, setError] = useState('')
    const [savedRecordId, setSavedRecordId] = useState<string | null>(null)
    const [historyDetail, setHistoryDetail] = useState<JobMatchRecord | null>(null)

    const abortRef = useRef<AbortController | null>(null)

    const selectedProfile = profiles.find(p => p.id === selectedProfileId) ?? null
    const canAnalyze = !!selectedProfileId && jobOffer.trim().length > 50

    // ── Appel 1 : analyse ────────────────────────────────────────────────────
    async function runAnalysis() {
        if (!selectedProfile) return
        abortRef.current?.abort()
        const ctrl = new AbortController()
        abortRef.current = ctrl

        setPageState('loading-analysis')
        setError('')
        setAnalysis(null)
        setRoadmap(null)
        setRoadmapError('')
        setSavedRecordId(null)
        setView('result')

        try {
            const apiKey = await getApiKey()
            if (!apiKey) throw new Error('Clé API OpenRouter non configurée. Rendez-vous dans Paramètres.')

            const res = await fetch(OPENROUTER_URL, {
                method: 'POST',
                signal: ctrl.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://localhost',
                    'X-Title': 'JAT Job Match - Analysis',
                },
                body: JSON.stringify({
                    model: selectedModel,
                    temperature: 0.2,
                    messages: [{ role: 'user', content: buildAnalysisPrompt(selectedProfile, jobOffer) }],
                }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`)
            if (data?.error) throw new Error(data.error.message ?? 'Erreur API OpenRouter')

            const raw: string = data?.choices?.[0]?.message?.content ?? ''
            if (!raw) throw new Error('Le modèle n\'a retourné aucun contenu.')

            let parsed: MatchAnalysis
            try {
                const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
                parsed = JSON.parse(cleaned)
            } catch {
                const match = raw.match(/\{[\s\S]*\}/)
                if (!match) throw new Error('Réponse inattendue : ' + raw.slice(0, 200))
                parsed = JSON.parse(match[0])
            }

            setAnalysis(parsed)

            const skillsToImprove = parsed.skills.filter(s => s.level !== 'fort')
            if (skillsToImprove.length > 0) {
                setPageState('loading-roadmap')
                runRoadmap(ctrl, apiKey, parsed, skillsToImprove)
            } else {
                setPageState('done')
            }
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') return
            setError(err instanceof Error ? err.message : 'Erreur inconnue')
            setPageState('form')
            setView('form')
        }
    }

    // ── Appel 2 : roadmap ────────────────────────────────────────────────────
    async function runRoadmap(
        ctrl: AbortController,
        apiKey: string,
        analysisResult: MatchAnalysis,
        skillsToImprove: MatchSkill[]
    ) {
        if (!selectedProfile) return
        try {
            const res = await fetch(OPENROUTER_URL, {
                method: 'POST',
                signal: ctrl.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://localhost',
                    'X-Title': 'JAT Job Match - Roadmap',
                },
                body: JSON.stringify({
                    model: selectedModel,
                    temperature: 0.3,
                    messages: [{ role: 'user', content: buildRoadmapPrompt(selectedProfile, jobOffer, skillsToImprove) }],
                }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`)
            if (data?.error) throw new Error(data.error.message ?? 'Erreur API OpenRouter')

            const raw: string = data?.choices?.[0]?.message?.content ?? ''
            if (!raw) throw new Error('Le modèle n\'a retourné aucun contenu (roadmap).')

            let parsed: RoadmapStep[]
            try {
                const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
                parsed = JSON.parse(cleaned)
            } catch {
                const match = raw.match(/\[[\s\S]*\]/)
                if (!match) throw new Error('Réponse inattendue (roadmap) : ' + raw.slice(0, 200))
                parsed = JSON.parse(match[0])
            }

            setRoadmap(parsed)
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') return
            setRoadmapError(err instanceof Error ? err.message : 'Erreur lors de la génération de la roadmap.')
        } finally {
            setPageState('done')
        }
    }

    // ── Save ─────────────────────────────────────────────────────────────────
    function handleSave() {
        if (!analysis || !selectedProfile) return
        const record = saveMatch({
            profileId: selectedProfile.id,
            profileName: `${selectedProfile.firstName} ${selectedProfile.lastName}`,
            jobOfferSnippet: jobOffer.trim().slice(0, 120).replace(/\s+/g, ' '),
            jobOffer,
            analysis,
            roadmap,
        })
        setSavedRecordId(record.id)
    }

    // ── Export ────────────────────────────────────────────────────────────────
    function handleExport(record?: JobMatchRecord) {
        if (record) { exportPDF(record); return }
        if (!analysis || !selectedProfile) return
        const tempRecord: JobMatchRecord = {
            id: 'tmp',
            profileId: selectedProfile.id,
            profileName: `${selectedProfile.firstName} ${selectedProfile.lastName}`,
            jobOfferSnippet: jobOffer.trim().slice(0, 120),
            jobOffer,
            analysis,
            roadmap,
            createdAt: new Date().toISOString(),
        }
        exportPDF(tempRecord)
    }

    function reset() {
        abortRef.current?.abort()
        setPageState('form')
        setAnalysis(null)
        setRoadmap(null)
        setError('')
        setRoadmapError('')
        setSavedRecordId(null)
        setView('form')
    }

    // ── Loading analyse ───────────────────────────────────────────────────────
    if (pageState === 'loading-analysis') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
                <div className="relative">
                    <div className="h-20 w-20 rounded-full border-4 border-border flex items-center justify-center">
                        <Sparkles className="h-8 w-8 text-muted-foreground animate-pulse" />
                    </div>
                    <div className="absolute inset-0 rounded-full border-4 border-t-foreground border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                </div>
                <div className="text-center">
                    <p className="font-display text-xl text-foreground">Analyse des compétences…</p>
                    <p className="text-sm text-muted-foreground mt-1">Comparaison du profil avec l'offre</p>
                </div>
                <Button variant="outline" size="sm" onClick={reset}>Annuler</Button>
            </div>
        )
    }

    // ── Result view ───────────────────────────────────────────────────────────
    if (view === 'result' && analysis) {
        return (
            <AnalysisView
                analysis={analysis}
                roadmap={roadmap}
                roadmapError={roadmapError}
                pageState={pageState}
                profile={selectedProfile}
                onSave={handleSave}
                onExport={() => handleExport()}
                onReset={reset}
                alreadySaved={!!savedRecordId}
            />
        )
    }

    // ── History detail ────────────────────────────────────────────────────────
    if (view === 'history-detail' && historyDetail) {
        return (
            <div className="max-w-2xl flex flex-col gap-6 pb-12">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => { setView('history'); setHistoryDetail(null) }}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" /> Historique
                    </button>
                    <Button variant="outline" size="sm" onClick={onExport}>
                        <Download className="h-3.5 w-3.5" /> Exporter (PDF)
                    </Button>
                </div>
                <AnalysisView
                    analysis={historyDetail.analysis}
                    roadmap={historyDetail.roadmap}
                    roadmapError=""
                    pageState="done"
                    profile={profiles.find(p => p.id === historyDetail.profileId) ?? null}
                    onSave={() => {}}
                    onExport={() => handleExport(historyDetail)}
                    onReset={() => { setView('history'); setHistoryDetail(null) }}
                    alreadySaved={true}
                />
            </div>
        )
    }

    // ── History list ──────────────────────────────────────────────────────────
    if (view === 'history') {
        return (
            <div className="max-w-2xl flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-display text-3xl text-foreground">Historique</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {matches.length} analyse{matches.length !== 1 ? 's' : ''} sauvegardée{matches.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <Button size="sm" onClick={() => setView('form')}>
                        <Sparkles className="h-4 w-4" /> Nouvelle analyse
                    </Button>
                </div>

                {matches.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-4 rounded-xl border border-dashed border-border text-center">
                        <History className="h-10 w-10 text-muted-foreground/30" />
                        <div>
                            <p className="font-medium text-foreground">Aucune analyse sauvegardée</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Lancez une analyse et sauvegardez-la pour la retrouver ici.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {matches.map(record => (
                            <HistoryCard
                                key={record.id}
                                record={record}
                                onClick={() => { setHistoryDetail(record); setView('history-detail') }}
                                onDelete={e => { e.stopPropagation(); deleteMatch(record.id) }}
                            />
                        ))}
                    </div>
                )}
            </div>
        )
    }

    // ── Form ─────────────────────────────────────────────────────────────────
    return (
        <div className="max-w-xl flex flex-col gap-6">
            <div className="flex items-end justify-between">
                <div>
                    <h1 className="font-display text-3xl text-foreground">Matching offre</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Analyse l'adéquation entre ton profil et une offre d'emploi
                    </p>
                </div>
                {matches.length > 0 && (
                    <button
                        onClick={() => setView('history')}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <History className="h-3.5 w-3.5" />
                        Historique ({matches.length})
                    </button>
                )}
            </div>

            {!hasKey && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                        Clé API OpenRouter requise.{' '}
                        <a href="/settings" className="underline font-medium">Paramètres</a>
                        {' '}pour la configurer.
                    </span>
                </div>
            )}

            {error && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-destructive/30 bg-destructive/5 text-xs text-destructive">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            {profiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4 rounded-xl border border-dashed border-border text-center">
                    <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                        <Sparkles className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                    <div>
                        <p className="font-medium text-foreground">Aucun profil candidat</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Crée un profil dans{' '}
                            <a href="/settings" className="underline hover:text-foreground transition-colors">Paramètres</a>
                            {' '}pour utiliser cette fonctionnalité.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                        <Label>Profil candidat *</Label>
                        <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Choisir un profil…" />
                            </SelectTrigger>
                            <SelectContent>
                                {profiles.map(p => (
                                    <SelectItem key={p.id} value={p.id}>
                                        <div className="flex items-center gap-2.5">
                                            <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-display shrink-0">
                                                {p.firstName.charAt(0)}{p.lastName.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">{p.name}</span>
                                                <span className="text-xs text-muted-foreground">{p.firstName} {p.lastName}</span>
                                            </div>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {selectedProfile && (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
                                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display text-sm shrink-0">
                                    {selectedProfile.firstName.charAt(0)}{selectedProfile.lastName.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-foreground text-sm truncate">{selectedProfile.name}</p>
                                    <p className="truncate mt-0.5">
                                        {selectedProfile.experiences.length} exp.
                                        {selectedProfile.skills && ` · ${selectedProfile.skills.slice(0, 60)}${selectedProfile.skills.length > 60 ? '…' : ''}`}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <Label>
                            Offre d'emploi *{' '}
                            <span className="text-muted-foreground/50 font-normal normal-case">
                                — colle le texte complet de l'annonce
                            </span>
                        </Label>
                        <Textarea
                            value={jobOffer}
                            onChange={e => setJobOffer(e.target.value)}
                            placeholder={"Nous recherchons un(e) développeur(se) fullstack…\n\nMissions :\n- …\n\nProfil recherché :\n- …"}
                            rows={12}
                            className="text-sm leading-relaxed"
                        />
                        {jobOffer.trim().length > 0 && jobOffer.trim().length < 50 && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Collez le texte complet de l'offre pour une analyse précise.
                            </p>
                        )}
                    </div>

                    <Button
                        onClick={runAnalysis}
                        disabled={!canAnalyze || !hasKey}
                        className="self-end"
                    >
                        <Sparkles className="h-4 w-4" />
                        Analyser le matching
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    )
}
