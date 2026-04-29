// src/pages/StatsPage.tsx
import { useJobs } from '@/hooks/useJobs'
import { StatsBar } from '@/components/stats/StatsBar'
import { STATUS_ORDER, type JobStatus } from '@/types'
import { daysBetween } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

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

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const total = jobs.length
  const countByStatus = STATUS_ORDER.reduce<Record<JobStatus, number>>(
    (acc, s) => ({ ...acc, [s]: jobs.filter((j) => j.status === s).length }),
    {} as Record<JobStatus, number>
  )
  const maxCount = Math.max(...Object.values(countByStatus), 1)

  const responded = jobs.filter((j) => j.status !== 'applied' && j.status !== 'abandoned').length
  const responseRate = total === 0 ? 0 : Math.round((responded / total) * 100)

  const interviews = jobs.filter((j) => ['interview', 'offer'].includes(j.status)).length
  const interviewRate =
    responded === 0 ? 0 : Math.round((interviews / responded) * 100)

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
        <h1 className="font-display text-3xl text-foreground">Statistiques</h1>
        <p className="text-sm text-muted-foreground mt-1">Vue d'ensemble de vos candidatures</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 mb-8 sm:grid-cols-4">
        <StatCard label="Total" value={total} />
        <StatCard label="Taux réponse" value={`${responseRate}%`} sub={`${responded} réponses`} />
        <StatCard label="Taux entretien" value={`${interviewRate}%`} sub={`${interviews} entretiens`} />
        <StatCard label="Moy. jours" value={avgDaysApplied} sub="en attente" />
      </div>

      {/* Bar chart */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-5">
          Répartition par statut
        </h2>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucune candidature pour l'instant
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {STATUS_ORDER.map((s) => (
              <StatsBar key={s} status={s} count={countByStatus[s]} max={maxCount} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
