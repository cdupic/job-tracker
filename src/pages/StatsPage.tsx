// src/pages/StatsPage.tsx
import { useJobs } from '@/hooks/useJobs'
import { StatsBar } from '@/components/stats/StatsBar'
import { type JobStatus } from '@/types'
import { daysBetween } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useKanbanConfig } from '@/hooks/useKanbanConfig'

interface StatCardProps {
    label: string
    value: string | number
    sub?: string
}

function StatCard({ label, value, sub }: StatCardProps) {
    return (
        <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-2">{label}</p>
            <p className="font-display text-4xl text-foreground">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
    )
}

export function StatsPage() {
    const { data: jobs = [], isLoading } = useJobs()
    const { t } = useI18n()
    const { columns } = useKanbanConfig()

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const total = jobs.length
    const countByStatus = columns.map(c => c.id).reduce<Record<JobStatus, number>>(
        (acc, s) => ({ ...acc, [s]: jobs.filter((j) => j.status === s).length }),
        {} as Record<JobStatus, number>
    )
    const maxCount = Math.max(...Object.values(countByStatus), 1)

    const responded = jobs.filter((j) => j.status !== 'applied' && j.status !== 'abandoned').length
    const responseRate = total === 0 ? 0 : Math.round((responded / total) * 100)

    const interviews = jobs.filter((j) => ['interview', 'offer'].includes(j.status)).length
    const interviewRate = responded === 0 ? 0 : Math.round((interviews / responded) * 100)

    const appliedJobs = jobs.filter((j) => j.status === 'applied')
    const avgDaysApplied =
        appliedJobs.length === 0
            ? 0
            : Math.round(
                appliedJobs.reduce((acc, j) => acc + daysBetween(j.dateApplied), 0) / appliedJobs.length
            )

    return (
        <div className="max-w-2xl">
            <div className="mb-8">
                <h1 className="font-display text-3xl text-foreground">{t.stats.title}</h1>
                <p className="text-sm text-muted-foreground mt-1">{t.stats.subtitle}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8 sm:grid-cols-4">
                <StatCard label={t.stats.total} value={total} />
                <StatCard
                    label={t.stats.responseRate}
                    value={`${responseRate}%`}
                    sub={`${responded} ${t.stats.responses}`}
                />
                <StatCard
                    label={t.stats.interviewRate}
                    value={`${interviewRate}%`}
                    sub={`${interviews} ${t.stats.interviews}`}
                />
                <StatCard label={t.stats.avgDays} value={avgDaysApplied} sub={t.stats.waiting} />
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-5">
                    {t.stats.distribution}
                </h2>
                {total === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">{t.stats.empty}</p>
                ) : (
                    <div className="flex flex-col gap-4">
                        {columns.map(c => c.id).map((s) => (
                            <StatsBar key={s} status={s} count={countByStatus[s]} max={maxCount} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
