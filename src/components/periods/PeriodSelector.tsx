// src/components/periods/PeriodSelector.tsx
import { cn } from '@/lib/utils'
import { usePeriods } from '@/hooks/usePeriods'
import { useActivePeriod } from '@/hooks/useActivePeriod'
import { PERIOD_COLOR_STYLES } from '@/types'
import { useI18n } from '@/i18n'
import { Layers } from 'lucide-react'

export function PeriodSelector() {
    const { data: periods = [] } = usePeriods()
    const { activePeriodId, setActivePeriodId } = useActivePeriod()
    const { t } = useI18n()

    if (periods.length === 0) return null

    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            {/* "All" pill */}
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
                const colors = PERIOD_COLOR_STYLES[period.color]
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
    )
}
