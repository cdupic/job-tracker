// src/components/companies/CompanyCard.tsx
import { useState } from 'react'
import { Globe, Users, Briefcase, TrendingUp, ExternalLink } from 'lucide-react'
import { cn, daysBetween, formatDate, ensureUrl } from '@/lib/utils'
import { type CompanyProfile, type JobApplication, COLUMN_COLOR_STYLES, FALLBACK_COLOR_STYLE, PERIOD_COLOR_STYLES } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CompanySheet } from './CompanySheet'
import { useKanbanConfig } from '@/hooks/useKanbanConfig'
import { usePeriods } from '@/hooks/usePeriods'
import { useI18n } from '@/i18n'

interface CompanyCardProps {
    company: CompanyProfile
    jobs: JobApplication[]
}

export function CompanyCard({ company, jobs }: CompanyCardProps) {
    const [open, setOpen] = useState(false)
    const { columns } = useKanbanConfig()
    const { data: periods = [] } = usePeriods()
    const { t } = useI18n()

    const respondedJobs = jobs.filter((j) => j.status !== 'applied' && j.status !== 'abandoned')
    const avgResponseDays = respondedJobs.length === 0 ? null :
        Math.round(respondedJobs.reduce((acc, j) => acc + daysBetween(j.dateApplied), 0) / respondedJobs.length)

    const latestJob = jobs.length > 0
        ? [...jobs].sort((a, b) => new Date(b.dateApplied).getTime() - new Date(a.dateApplied).getTime())[0]
        : null

    const latestCol = latestJob ? columns.find((c) => c.id === latestJob.status) : null
    const latestColors = latestCol ? COLUMN_COLOR_STYLES[latestCol.color] : FALLBACK_COLOR_STYLE

    // Unique periods across this company's jobs
    const usedPeriods = periods.filter((p) => jobs.some((j) => j.periodId === p.id))

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className={cn(
                    'group text-left bg-card border border-border rounded-xl p-5',
                    'hover:border-foreground/20 hover:shadow-md transition-all duration-150',
                    'animate-slide-up flex flex-col gap-4'
                )}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-0.5 min-w-0">
                        <p className="font-semibold text-[15px] text-foreground leading-tight truncate">
                            {company.displayName}
                        </p>
                        {company.sector && (
                            <p className="text-xs text-muted-foreground truncate">{company.sector}</p>
                        )}
                    </div>
                    {company.website && (
                        <a
                            href={ensureUrl(company.website!)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0 text-muted-foreground/50 hover:text-foreground transition-colors mt-0.5"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                    )}
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-0.5">
                        <p className="font-display text-xl text-foreground">{jobs.length}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-tight">{t.companies.statApplications}</p>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <p className="font-display text-xl text-foreground">{respondedJobs.length}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-tight">{t.companies.statResponses}</p>
                    </div>
                    <div className="flex flex-col gap-0.5">
                        <p className="font-display text-xl text-foreground">{avgResponseDays ?? '—'}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-tight">{t.companies.statAvgDays}</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-2">
                    {/* Period chips */}
                    <div className="flex gap-1 flex-wrap min-w-0">
                        {usedPeriods.map((p) => (
                            <span
                                key={p.id}
                                className={cn(
                                    'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium border',
                                    PERIOD_COLOR_STYLES[p.color].badge,
                                    PERIOD_COLOR_STYLES[p.color].border
                                )}
                            >
                <span className={cn('h-1 w-1 rounded-full', PERIOD_COLOR_STYLES[p.color].dot)} />
                                {p.name}
              </span>
                        ))}
                    </div>

                    {/* Latest status badge */}
                    {latestJob && (
                        <Badge className={cn(latestColors.badge, 'text-[10px] shrink-0')}>
                            {latestCol?.label ?? latestJob.status}
                        </Badge>
                    )}
                </div>

                {/* Contacts count */}
                {company.contacts.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground border-t border-border pt-3">
                        <Users className="h-3.5 w-3.5" />
                        <span>{company.contacts.length} {t.companies.contactsCount}</span>
                    </div>
                )}
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg">
                    <CompanySheet companyId={company.id} onClose={() => setOpen(false)} />
                </DialogContent>
            </Dialog>
        </>
    )
}
