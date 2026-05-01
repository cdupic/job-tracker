// src/pages/CompaniesPage.tsx
import { useState } from 'react'
import { Plus, Loader2, Search, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CompanyCard } from '@/components/companies/CompanyCard'
import { CompanySheet } from '@/components/companies/CompanySheet'
import { useCompanies } from '@/hooks/useCompanies'
import { useJobs } from '@/hooks/useJobs'
import { usePeriods } from '@/hooks/usePeriods'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'
import { PERIOD_COLOR_STYLES, type PeriodColor } from '@/types'
import { Layers } from 'lucide-react'

export function CompaniesPage() {
    const [search, setSearch] = useState('')
    const [createOpen, setCreateOpen] = useState(false)
    const [activePeriodId, setActivePeriodId] = useState<string | null>(null)

    const { data: companies = [], isLoading } = useCompanies()
    const { data: allJobs = [] } = useJobs()
    const { data: periods = [] } = usePeriods()
    const { t } = useI18n()

    // Jobs filtered by active period
    const periodFilteredJobs = activePeriodId
        ? allJobs.filter((j) => j.periodId === activePeriodId)
        : allJobs

    const jobsForCompany = (companyId: string) => {
        const c = companies.find((c) => c.id === companyId)
        if (!c) return []
        return periodFilteredJobs.filter(
            (j) => j.companyId === companyId || j.company.toLowerCase().trim() === c.name
        )
    }

    // Only show companies that have at least one job in the selected period
    // (if no period filter, show all companies)
    const companiesInPeriod = activePeriodId
        ? companies.filter((c) => jobsForCompany(c.id).length > 0)
        : companies

    const filtered = companiesInPeriod.filter((c) =>
        c.displayName.toLowerCase().includes(search.toLowerCase().trim()) ||
        c.sector?.toLowerCase().includes(search.toLowerCase().trim())
    )

    // Inferred companies (jobs with no profile), also period-filtered
    const jobCompanyNames = [
        ...new Set(
            periodFilteredJobs
                .filter((j) => !!j.company)
                .map((j) => j.company.toLowerCase().trim())
        ),
    ]
    const missingCompanyNames = jobCompanyNames.filter(
        (name) => !companies.some((c) => c.name === name)
    )

    const isEmpty = filtered.length === 0 && missingCompanyNames.length === 0

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-end justify-between mb-6">
                <div>
                    <h1 className="font-display text-3xl text-foreground">{t.companies.title}</h1>
                    <p className="text-sm text-muted-foreground mt-1">{t.companies.subtitle}</p>
                </div>
                <Button onClick={() => setCreateOpen(true)} size="sm">
                    <Plus className="h-4 w-4" />
                    {t.companies.newButton}
                </Button>
            </div>

            {/* Filters row */}
            <div className="flex flex-col gap-3 mb-6">
                {/* Search */}
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t.companies.searchPlaceholder}
                        className="pl-9"
                    />
                </div>

                {/* Period filter */}
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
                        {periods.map((period) => {
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
            </div>

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : isEmpty ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                        <Building2 className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <div>
                        <p className="font-medium text-foreground">{t.companies.empty}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {activePeriodId
                                ? t.periods.emptyDesc
                                : t.companies.emptyDesc}
                        </p>
                    </div>
                    {!activePeriodId && (
                        <Button onClick={() => setCreateOpen(true)} variant="outline" size="sm">
                            <Plus className="h-4 w-4" />
                            {t.companies.newButton}
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-8">
                    {filtered.map((company) => (
                        <CompanyCard
                            key={company.id}
                            company={company}
                            jobs={jobsForCompany(company.id)}
                        />
                    ))}

                    {/* Inferred companies (jobs with no profile yet) */}
                    {!search && missingCompanyNames.map((name) => {
                        const jobs = periodFilteredJobs.filter(
                            (j) => j.company?.toLowerCase().trim() === name
                        )
                        const displayName = jobs[0]?.company ?? name
                        return (
                            <button
                                key={name}
                                onClick={() => setCreateOpen(true)}
                                className="text-left bg-card border border-dashed border-border rounded-xl p-5 flex flex-col gap-3 hover:border-foreground/30 hover:bg-accent/30 transition-all group"
                            >
                                <div className="flex items-start justify-between">
                                    <p className="font-semibold text-[15px] text-foreground/60 group-hover:text-foreground transition-colors">{displayName}</p>
                                    <span className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                                        {t.companies.noProfile}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">{jobs.length} {t.companies.statApplications}</p>
                                <p className="text-xs text-muted-foreground/50 flex items-center gap-1">
                                    <Plus className="h-3 w-3" /> {t.companies.createProfile}
                                </p>
                            </button>
                        )
                    })}
                </div>
            )}

            {/* Create dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t.companies.newTitle}</DialogTitle>
                    </DialogHeader>
                    <CompanySheet onClose={() => setCreateOpen(false)} />
                </DialogContent>
            </Dialog>
        </div>
    )
}
