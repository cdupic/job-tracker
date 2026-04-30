// src/components/kanban/KanbanColumn.tsx
import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type JobApplication, type JobStatus, COLUMN_COLOR_STYLES, FALLBACK_COLOR_STYLE } from '@/types'
import { JobCard } from './JobCard'
import { useI18n } from '@/i18n'
import { useKanbanConfig } from '@/hooks/useKanbanConfig'

interface KanbanColumnProps {
    status: JobStatus
    jobs: JobApplication[]
    followUpDays: number
}

export function KanbanColumn({ status, jobs, followUpDays }: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id: status })
    const { t } = useI18n()
    const { columns } = useKanbanConfig()
    const [sortAsc, setSortAsc] = useState(false)

    const col = columns.find((c) => c.id === status)
    const colors = col ? COLUMN_COLOR_STYLES[col.color] : FALLBACK_COLOR_STYLE
    const label = col?.label || status

    const sortedJobs = [...jobs].sort((a, b) => {
        const diff = new Date(a.dateApplied).getTime() - new Date(b.dateApplied).getTime()
        return sortAsc ? diff : -diff
    })

    return (
        <div className="flex flex-col min-w-[260px] w-[260px] shrink-0">
            {/* Column header */}
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2 min-w-0">
                    <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', colors.dot)} />
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-foreground/60 truncate">
                        {label}
                    </h2>
                    {jobs.length > 0 && (
                        <span className="text-[10px] font-mono text-muted-foreground/50 tabular-nums shrink-0">
              {jobs.length}
            </span>
                    )}
                </div>

                {/* Sort toggle */}
                <button
                    onClick={() => setSortAsc((v) => !v)}
                    className={cn(
                        'flex items-center gap-1 h-6 px-1.5 rounded text-[10px] font-mono transition-colors shrink-0',
                        'text-muted-foreground/40 hover:text-muted-foreground hover:bg-accent'
                    )}
                    title={sortAsc ? 'Tri croissant' : 'Tri décroissant'}
                >
                    {sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                </button>
            </div>

            {/* Drop zone */}
            <div
                ref={setNodeRef}
                className={cn(
                    'flex flex-col gap-2 min-h-[120px] rounded-xl transition-colors duration-150 p-1 -m-1',
                    isOver && 'bg-accent/50'
                )}
            >
                <SortableContext items={sortedJobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
                    {sortedJobs.map((job) => (
                        <JobCard key={job.id} job={job} followUpDays={followUpDays} />
                    ))}
                </SortableContext>

                {jobs.length === 0 && (
                    <div className="flex items-center justify-center h-16 rounded-xl border border-dashed border-border/50">
                        <p className="text-[10px] text-muted-foreground/30 font-mono">{t.column.empty}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
