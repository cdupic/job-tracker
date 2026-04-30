// src/components/kanban/KanbanColumn.tsx
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
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

    const col = columns.find(c => c.id === status)
    const colors = col ? COLUMN_COLOR_STYLES[col.color] : FALLBACK_COLOR_STYLE
    const label = col?.label || status

    const sortedJobs = [...jobs].sort(
        (a, b) => new Date(b.dateApplied).getTime() - new Date(a.dateApplied).getTime()
    )

    return (
        <div className="flex flex-col min-w-[240px] w-[240px] shrink-0">
            {/* Column header */}
            <div className={cn('flex items-center justify-between mb-3 pb-3 border-b', colors.column)}>
                <div className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full shrink-0', colors.dot)} />
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-foreground/70">
                        {label}
                    </h2>
                </div>
                {jobs.length > 0 && (
                    <span className="text-xs font-mono text-muted-foreground tabular-nums">
            {jobs.length}
          </span>
                )}
            </div>

            {/* Drop zone */}
            <div
                ref={setNodeRef}
                className={cn(
                    'flex flex-col gap-2 min-h-[120px] rounded-lg transition-colors p-1 -m-1',
                    isOver && 'bg-accent/60'
                )}
            >
                <SortableContext items={sortedJobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
                    {sortedJobs.map((job) => (
                        <JobCard key={job.id} job={job} followUpDays={followUpDays} />
                    ))}
                </SortableContext>

                {jobs.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-20 rounded-lg border border-dashed border-border">
                        <p className="text-[11px] text-muted-foreground/50 font-mono">{t.column.empty}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
