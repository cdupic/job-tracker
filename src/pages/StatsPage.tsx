// src/pages/StatsPage.tsx
import { useState, useMemo } from 'react'
import { useJobs } from '@/hooks/useJobs'
import { usePeriods } from '@/hooks/usePeriods'
import { StatsBar } from '@/components/stats/StatsBar'
import { type JobStatus, PERIOD_COLOR_STYLES, type PeriodColor } from '@/types'
import { daysBetween, formatDate } from '@/lib/utils'
import { Loader2, Layers, TrendingUp, Clock, Target, Calendar } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useKanbanConfig } from '@/hooks/useKanbanConfig'
import { cn } from '@/lib/utils'

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
                      label, value, sub, icon: Icon, accent,
                  }: {
    label: string
    value: string | number
    sub?: string
    icon?: React.FC<{ className?: string }>
    accent?: string
}) {
    return (
        <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
            {Icon && (
                <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', accent ?? 'bg-muted')}>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
            )}
            <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">{label}</p>
                <p className="font-display text-4xl text-foreground mt-1">{value}</p>
                {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            </div>
        </div>
    )
}

// ── Funnel chart ──────────────────────────────────────────────────────────────
function FunnelChart({ steps }: { steps: { label: string; count: number; color: string }[] }) {
    const max = steps[0]?.count || 1
    return (
        <div className="flex flex-col gap-2">
            {steps.map((step, i) => {
                const pct = max === 0 ? 0 : (step.count / max) * 100
                const conversionFromPrev = i === 0 || steps[i - 1].count === 0
                    ? null
                    : Math.round((step.count / steps[i - 1].count) * 100)
                return (
                    <div key={step.label} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <span className={cn('h-2 w-2 rounded-full shrink-0', step.color)} />
                                <span className="text-muted-foreground">{step.label}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                {conversionFromPrev !== null && (
                                    <span className="text-[10px] font-mono text-muted-foreground/60">
                    {conversionFromPrev}%
                  </span>
                                )}
                                <span className="font-mono font-semibold text-foreground w-6 text-right">
                  {step.count}
                </span>
                            </div>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                                className={cn('h-full rounded-full transition-all duration-700', step.color)}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

// ── Timeline chart (applications par semaine/mois) ────────────────────────────
function TimelineChart({ jobs }: { jobs: { dateApplied: string }[] }) {
    const { t } = useI18n()
    const BAR_HEIGHT = 96

    const buckets = useMemo(() => {
        if (jobs.length === 0) return []

        const dates = jobs
            .map(j => new Date(j.dateApplied + 'T12:00:00').getTime())
            .sort((a, b) => a - b)
        const minDate = new Date(dates[0])
        const maxDate = new Date(dates[dates.length - 1])
        const diffDays = Math.ceil(
            (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        // Granularité : jour si ≤ 21j de plage, semaine si ≤ 90j, mois sinon
        const granularity: 'day' | 'week' | 'month' =
            diffDays <= 21 ? 'day' : diffDays <= 90 ? 'week' : 'month'

        const map = new Map<string, number>()
        jobs.forEach(j => {
            const d = new Date(j.dateApplied + 'T12:00:00')
            let key: string
            if (granularity === 'day') {
                key = j.dateApplied // YYYY-MM-DD
            } else if (granularity === 'week') {
                const day = d.getDay()
                const monday = new Date(d)
                monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
                key = monday.toISOString().split('T')[0]
            } else {
                key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            }
            map.set(key, (map.get(key) ?? 0) + 1)
        })

        // En mode jour, remplir les jours sans candidature entre le min et le max
        // pour que l'axe soit continu (barres à 0 entre les dates actives)
        if (granularity === 'day') {
            const cursor = new Date(minDate)
            while (cursor <= maxDate) {
                const key = cursor.toISOString().split('T')[0]
                if (!map.has(key)) map.set(key, 0)
                cursor.setDate(cursor.getDate() + 1)
            }
        }

        const sorted = [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
        const maxCount = Math.max(...sorted.map(([, v]) => v), 1)

        return sorted.map(([key, count]) => {
            let label: string
            if (granularity === 'day') {
                const [y, m, d] = key.split('-').map(Number)
                label = new Intl.DateTimeFormat(t.intlLocale, {
                    day: '2-digit', month: 'short',
                }).format(new Date(y, m - 1, d))
            } else if (granularity === 'week') {
                const [y, m, d] = key.split('-').map(Number)
                label = new Intl.DateTimeFormat(t.intlLocale, {
                    day: '2-digit', month: 'short',
                }).format(new Date(y, m - 1, d))
            } else {
                const [y, m] = key.split('-').map(Number)
                label = new Intl.DateTimeFormat(t.intlLocale, {
                    month: 'short', year: '2-digit',
                }).format(new Date(y, m - 1, 1))
            }
            const heightPx =
                count === 0 ? 0 : Math.max(4, Math.round((count / maxCount) * BAR_HEIGHT))
            return { key, label, count, heightPx }
        })
    }, [jobs, t.intlLocale])

    if (buckets.length === 0)
        return <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>

    // Labels X : on en affiche max ~6 pour éviter l'encombrement
    const showEvery = Math.max(1, Math.floor(buckets.length / 6))

    return (
        <div className="flex flex-col gap-2">
            <div
                className="flex items-end gap-0.5"
                style={{ height: BAR_HEIGHT + 24 }}
            >
                {buckets.map(bucket => (
                    <div
                        key={bucket.key}
                        className="flex-1 flex flex-col items-center justify-end gap-0.5"
                        style={{ height: '100%' }}
                    >
            <span
                className="text-[9px] font-mono text-muted-foreground leading-none"
                style={{ visibility: bucket.count > 0 ? 'visible' : 'hidden' }}
            >
              {bucket.count}
            </span>
                        <div
                            className={cn(
                                'w-full rounded-sm transition-colors duration-150',
                                bucket.count > 0
                                    ? 'bg-primary/25 hover:bg-primary/50'
                                    : 'bg-transparent'
                            )}
                            style={{ height: `${bucket.heightPx}px`, minHeight: bucket.count > 0 ? '4px' : '0' }}
                        />
                    </div>
                ))}
            </div>

            {/* Axe X */}
            <div className="flex items-center gap-0.5">
                {buckets.map((bucket, i) => (
                    <div key={bucket.key} className="flex-1 text-center overflow-hidden">
                        {(i === 0 || i === buckets.length - 1 || i % showEvery === 0) && (
                            <span className="text-[9px] font-mono text-muted-foreground/60 leading-none">
                {bucket.label}
              </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
// ── Donut chart (SVG) ─────────────────────────────────────────────────────────
function DonutChart({
                        segments,
                    }: {
    segments: { label: string; count: number; colorClass: string; hex: string }[]
}) {
    const total = segments.reduce((s, seg) => s + seg.count, 0)
    if (total === 0) return (
        <p className="text-sm text-muted-foreground text-center py-4">Aucune donnée</p>
    )

    const r = 40
    const cx = 60
    const cy = 60
    const circumference = 2 * Math.PI * r

    let cumulative = 0
    const slices = segments.filter(s => s.count > 0).map(seg => {
        const pct = seg.count / total
        const offset = circumference * (1 - cumulative)
        const dash = circumference * pct
        cumulative += pct
        return { ...seg, dash, offset }
    })

    return (
        <div className="flex items-center gap-6">
            <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0 -rotate-90">
                {slices.map((slice, i) => (
                    <circle
                        key={i}
                        cx={cx} cy={cy} r={r}
                        fill="none"
                        stroke={slice.hex}
                        strokeWidth="18"
                        strokeDasharray={`${slice.dash} ${circumference - slice.dash}`}
                        strokeDashoffset={slice.offset}
                        opacity="0.85"
                    />
                ))}
            </svg>
            <div className="flex flex-col gap-2 flex-1 min-w-0">
                {segments.filter(s => s.count > 0).map(seg => (
                    <div key={seg.label} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className={cn('h-2 w-2 rounded-full shrink-0', seg.colorClass)} />
                            <span className="text-xs text-muted-foreground truncate">{seg.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs font-mono text-foreground">{seg.count}</span>
                            <span className="text-[10px] font-mono text-muted-foreground/60">
                {Math.round((seg.count / total) * 100)}%
              </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ── HEX colors for SVG (Tailwind ne marche pas en attribut stroke) ────────────
const STATUS_HEX: Record<string, string> = {
    blue:   '#3b82f6',
    violet: '#8b5cf6',
    amber:  '#f59e0b',
    green:  '#10b981',
    red:    '#f87171',
    gray:   '#a1a1aa',
    pink:   '#ec4899',
    cyan:   '#06b6d4',
    orange: '#f97316',
    teal:   '#14b8a6',
    indigo: '#6366f1',
    rose:   '#f43f5e',
}

// ── Page principale ───────────────────────────────────────────────────────────
export function StatsPage() {
    const { data: jobs = [], isLoading } = useJobs()
    const { data: periods = [] } = usePeriods()
    const { t } = useI18n()
    const { columns } = useKanbanConfig()

    const [activePeriodId, setActivePeriodId] = useState<string | null>(null)

    const filteredJobs = activePeriodId
        ? jobs.filter(j => j.periodId === activePeriodId)
        : jobs

    // ── Métriques ──────────────────────────────────────────────────────────────
    const total = filteredJobs.length

    const countByStatus = useMemo(() =>
        columns.reduce<Record<string, number>>(
            (acc, c) => ({ ...acc, [c.id]: filteredJobs.filter(j => j.status === c.id).length }),
            {}
        ), [filteredJobs, columns])

    const maxCount = Math.max(...Object.values(countByStatus), 1)

    const responded = filteredJobs.filter(j => {
        const col = columns.find(c => c.id === j.status)
        return col && !['applied', 'abandoned'].includes(j.status)
    }).length

    const responseRate = total === 0 ? 0 : Math.round((responded / total) * 100)

    const interviews = filteredJobs.filter(j => ['interview', 'offer'].includes(j.status)).length
    const interviewRate = responded === 0 ? 0 : Math.round((interviews / responded) * 100)

    const offers = filteredJobs.filter(j => j.status === 'offer').length
    const offerRate = interviews === 0 ? 0 : Math.round((offers / interviews) * 100)

    const appliedJobs = filteredJobs.filter(j => j.status === 'applied')
    const avgDaysApplied = appliedJobs.length === 0 ? 0
        : Math.round(appliedJobs.reduce((acc, j) => acc + daysBetween(j.dateApplied), 0) / appliedJobs.length)

    // Jours moyens avant réponse (jobs qui ont quitté "applied")
    const respondedJobs = filteredJobs.filter(j => !['applied', 'abandoned'].includes(j.status))
    const avgDaysToResponse = respondedJobs.length === 0 ? 0
        : Math.round(respondedJobs.reduce((acc, j) => acc + daysBetween(j.dateApplied), 0) / respondedJobs.length)

    // Funnel : applied → responded → interview → offer
    const funnelSteps = columns
        .filter(c => ['applied', 'responded', 'interview', 'offer'].includes(c.id))
        .map(c => ({
            label: c.label,
            count: countByStatus[c.id] ?? 0,
            color: `bg-${c.color}-500`,
        }))

    // Donut segments
    const donutSegments = columns.map(c => ({
        label: c.label,
        count: countByStatus[c.id] ?? 0,
        colorClass: `bg-${c.color}-500`,
        hex: STATUS_HEX[c.color] ?? '#a1a1aa',
    }))

    if (isLoading) return (
        <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
    )

    return (
        <div className="max-w-3xl flex flex-col gap-8">
            {/* Header */}
            <div>
                <h1 className="font-display text-3xl text-foreground">{t.stats.title}</h1>
                <p className="text-sm text-muted-foreground mt-1">{t.stats.subtitle}</p>
            </div>

            {/* Filtre période */}
            {periods.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                    <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <button
                        onClick={() => setActivePeriodId(null)}
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all',
                            activePeriodId === null
                                ? 'bg-foreground text-background border-foreground'
                                : 'bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground'
                        )}
                    >
                        {t.periods.all}
                    </button>
                    {periods.map(period => {
                        const colors = PERIOD_COLOR_STYLES[period.color as PeriodColor] ?? PERIOD_COLOR_STYLES.blue
                        const isActive = activePeriodId === period.id
                        return (
                            <button
                                key={period.id}
                                onClick={() => setActivePeriodId(period.id)}
                                className={cn(
                                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all',
                                    isActive
                                        ? cn(colors.badge, 'border', colors.border)
                                        : 'bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground'
                                )}
                            >
                                <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', colors.dot)} />
                                {period.name}
                                {!period.endDate && (
                                    <span className={cn(
                                        'text-[9px] font-mono px-1 rounded',
                                        isActive ? 'bg-white/20 dark:bg-black/20' : 'bg-muted text-muted-foreground'
                                    )}>
                    {t.periods.active}
                  </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            )}

            {total === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <p className="font-medium text-foreground">{t.stats.empty}</p>
                    <p className="text-sm text-muted-foreground">
                        {activePeriodId ? 'Aucune candidature pour cette période.' : ''}
                    </p>
                </div>
            ) : (
                <>
                    {/* Stat cards */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <StatCard
                            label={t.stats.total}
                            value={total}
                            icon={Target}
                            accent="bg-blue-50 dark:bg-blue-950"
                        />
                        <StatCard
                            label={t.stats.responseRate}
                            value={`${responseRate}%`}
                            sub={`${responded} ${t.stats.responses}`}
                            icon={TrendingUp}
                            accent="bg-violet-50 dark:bg-violet-950"
                        />
                        <StatCard
                            label={t.stats.interviewRate}
                            value={`${interviewRate}%`}
                            sub={`${interviews} ${t.stats.interviews}`}
                            icon={Calendar}
                            accent="bg-amber-50 dark:bg-amber-950"
                        />
                        <StatCard
                            label={t.stats.avgDays}
                            value={avgDaysApplied}
                            sub={t.stats.waiting}
                            icon={Clock}
                            accent="bg-muted"
                        />
                    </div>

                    {/* Ligne 2 : timeline + donut */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Timeline */}
                        <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
                            <div>
                                <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                                    Candidatures dans le temps
                                </h2>
                                {filteredJobs.length > 1 && (
                                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                                        {formatDate(
                                            [...filteredJobs].sort((a, b) => a.dateApplied.localeCompare(b.dateApplied))[0].dateApplied,
                                            t.intlLocale
                                        )}
                                        {' → '}
                                        {formatDate(
                                            [...filteredJobs].sort((a, b) => b.dateApplied.localeCompare(a.dateApplied))[0].dateApplied,
                                            t.intlLocale
                                        )}
                                    </p>
                                )}
                            </div>
                            <TimelineChart jobs={filteredJobs} />
                        </div>

                        {/* Donut */}
                        <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
                            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                                {t.stats.distribution}
                            </h2>
                            <DonutChart segments={donutSegments} />
                        </div>
                    </div>

                    {/* Ligne 3 : funnel + barres */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Funnel */}
                        <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
                            <div>
                                <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                                    Entonnoir de conversion
                                </h2>
                                <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                                    Taux entre chaque étape affiché à droite
                                </p>
                            </div>
                            {funnelSteps.length > 0
                                ? <FunnelChart steps={funnelSteps} />
                                : <p className="text-sm text-muted-foreground text-center py-4">Configurer les colonnes</p>
                            }
                            {/* Taux offre */}
                            {offers > 0 && (
                                <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Taux offre / entretien</span>
                                    <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {offerRate}%
                  </span>
                                </div>
                            )}
                        </div>

                        {/* Distribution par statut */}
                        <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
                            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                                {t.stats.distribution}
                            </h2>
                            <div className="flex flex-col gap-4">
                                {columns.map(c => (
                                    <StatsBar
                                        key={c.id}
                                        status={c.id}
                                        count={countByStatus[c.id] ?? 0}
                                        max={maxCount}
                                    />
                                ))}
                            </div>
                            {/* Temps moyen avant réponse */}
                            <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Délai moyen avant réponse</span>
                                <span className="font-mono font-semibold text-foreground">
                  {avgDaysToResponse}j
                </span>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
