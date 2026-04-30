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
import { useI18n } from '@/i18n'

export function CompaniesPage() {
    const [search, setSearch] = useState('')
    const [createOpen, setCreateOpen] = useState(false)
    const { data: companies = [], isLoading } = useCompanies()
    const { data: allJobs = [] } = useJobs()
    const { t } = useI18n()

    const filtered = companies.filter((c) =>
        c.displayName.toLowerCase().includes(search.toLowerCase()) ||
        c.sector?.toLowerCase().includes(search.toLowerCase())
    )

    // Also show companies inferred from jobs that have no profile yet
    const jobCompanyNames = [...new Set(allJobs.filter((j) => !!j.company).map((j) => j.company.toLowerCase().trim()))]
    const missingCompanyNames = jobCompanyNames.filter(
        (name) => !companies.some((c) => c.name === name)
    )

    const jobsForCompany = (companyId: string) =>
        allJobs.filter((j) => {
            const c = companies.find((c) => c.id === companyId)
            if (!c) return false
            return j.companyId === companyId || j.company.toLowerCase().trim() === c.name
        })

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-end justify-between mb-8">
                <div>
                    <h1 className="font-display text-3xl text-foreground">{t.companies.title}</h1>
                    <p className="text-sm text-muted-foreground mt-1">{t.companies.subtitle}</p>
                </div>
                <Button onClick={() => setCreateOpen(true)} size="sm">
                    <Plus className="h-4 w-4" />
                    {t.companies.newButton}
                </Button>
            </div>

            {/* Search */}
            <div className="relative mb-6 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t.companies.searchPlaceholder}
                    className="pl-9"
                />
            </div>

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : filtered.length === 0 && missingCompanyNames.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                        <Building2 className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <div>
                        <p className="font-medium text-foreground">{t.companies.empty}</p>
                        <p className="text-sm text-muted-foreground mt-1">{t.companies.emptyDesc}</p>
                    </div>
                    <Button onClick={() => setCreateOpen(true)} variant="outline" size="sm">
                        <Plus className="h-4 w-4" />
                        {t.companies.newButton}
                    </Button>
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

                    {/* Inferred companies (from job data, no profile yet) */}
                    {!search && missingCompanyNames.map((name) => {
                        const jobs = allJobs.filter((j) => j.company.toLowerCase().trim() === name)
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
