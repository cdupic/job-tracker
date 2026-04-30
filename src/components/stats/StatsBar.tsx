// src/components/stats/StatsBar.tsx
import { cn } from '@/lib/utils'
import { STATUS_COLORS, type JobStatus } from '@/types'
import { useI18n } from '@/i18n'

interface StatsBarProps {
    status: JobStatus
    count: number
    max: number
}

export function StatsBar({ status, count, max }: StatsBarProps) {
    const pct = max === 0 ? 0 : Math.round((count / max) * 100)
    const colors = STATUS_COLORS[status]
    const { t } = useI18n()

    return (
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 w-40 shrink-0">
                <span className={cn('h-2 w-2 rounded-full shrink-0', colors.dot)} />
                <span className="text-xs text-muted-foreground">{t.status[status]}</span>
            </div>
            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                    className={cn('h-full rounded-full transition-all duration-500', colors.dot)}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="text-xs font-mono text-muted-foreground w-8 text-right">{count}</span>
        </div>
    )
}
