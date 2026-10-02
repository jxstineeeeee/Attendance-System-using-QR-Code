import { useState } from 'react'
import { ENROLLED, pct, type DayTotals } from '../lib/mock'

/*
 * Share of enrolment by day. Every column totals the same enrolment figure, so
 * the honest form is part-to-whole — a 100% stacked column, not three free bars.
 *
 * Present / Late / Absent are statuses rather than series, so the fills come
 * from the reserved status ramp in index.css and are never reused elsewhere.
 * Two of the three sit under 3:1 against white, so identity never rests on
 * colour alone: there is a legend, the Present share is labelled directly on
 * every column, each column has a hover tooltip, and the same numbers are
 * listed in the table underneath.
 */

// Sized close to the rendered width so the SVG's own text is not scaled up
// past the page's type scale.
const W = 1040
const H = 304
const PAD = { top: 16, right: 8, bottom: 48, left: 48 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom
const BAND = PLOT_W / 5
const BAR_W = 96
const GAP = 2 // surface gap between stacked segments
const R = 4 // rounded data-ends

const SERIES = [
  { key: 'present', label: 'Present', fill: 'var(--color-present)' },
  { key: 'late', label: 'Late', fill: 'var(--color-late)' },
  { key: 'absent', label: 'Absent', fill: 'var(--color-absent)' },
] as const

const TICKS = [0, 25, 50, 75, 100]

/** Rect with per-corner radii, so only the data-ends of a stack get rounded. */
function barPath(x: number, y: number, w: number, h: number, rTop: number, rBottom: number) {
  const top = Math.min(rTop, h / 2)
  const bot = Math.min(rBottom, h / 2)
  return [
    `M${x},${y + top}`,
    `a${top},${top} 0 0 1 ${top},${-top}`,
    `h${w - top * 2}`,
    `a${top},${top} 0 0 1 ${top},${top}`,
    `v${h - top - bot}`,
    `a${bot},${bot} 0 0 1 ${-bot},${bot}`,
    `h${-(w - bot * 2)}`,
    `a${bot},${bot} 0 0 1 ${-bot},${-bot}`,
    'Z',
  ].join(' ')
}

export function AttendanceChart({ week }: { week: DayTotals[] }) {
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <Legend />

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label="Share of enrolment present, late and absent for each day this week"
        >
          {/* Recessive grid: hairlines behind the marks, ticks in muted ink. */}
          {TICKS.map((t) => {
            const y = PAD.top + PLOT_H - (t / 100) * PLOT_H
            return (
              <g key={t}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={y}
                  y2={y}
                  stroke={t === 0 ? 'var(--color-axis)' : 'var(--color-grid)'}
                  strokeWidth={1}
                />
                <text
                  x={PAD.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-subtle text-[12px] tabular-nums"
                >
                  {t}%
                </text>
              </g>
            )
          })}

          {week.map((d, i) => {
            const x = PAD.left + i * BAND + (BAND - BAR_W) / 2
            const active = hovered === null || hovered === i

            // Stack bottom-up so Present sits on the baseline.
            let cursor = PAD.top + PLOT_H
            const segments = SERIES.map((s, si) => {
              const share = d[s.key] / ENROLLED
              const raw = share * PLOT_H
              const h = Math.max(0, raw - (si === 0 ? 0 : GAP))
              const y = cursor - h
              cursor -= raw
              return { ...s, y, h, value: d[s.key] }
            })

            return (
              <g key={d.day} opacity={active ? 1 : 0.42} className="transition-opacity">
                {segments.map((s, si) => (
                  <path
                    key={s.key}
                    d={barPath(
                      x,
                      s.y,
                      BAR_W,
                      s.h,
                      si === SERIES.length - 1 ? R : 0,
                      si === 0 ? R : 0,
                    )}
                    fill={s.fill}
                  />
                ))}

                {/* Direct label — the Present share, the number the row is read for. */}
                <text
                  x={x + BAR_W / 2}
                  y={segments[0].y + 22}
                  textAnchor="middle"
                  className="fill-white text-[15px] font-semibold tabular-nums"
                >
                  {pct(d.present, ENROLLED)}%
                </text>

                <text
                  x={x + BAR_W / 2}
                  y={H - 26}
                  textAnchor="middle"
                  className="fill-ink text-[13px] font-semibold"
                >
                  {d.day}
                </text>
                <text
                  x={x + BAR_W / 2}
                  y={H - 9}
                  textAnchor="middle"
                  className="fill-subtle text-[11px]"
                >
                  {d.date}
                </text>

                {/* Hit target spans the whole band, not just the bar itself. */}
                <rect
                  x={PAD.left + i * BAND}
                  y={PAD.top}
                  width={BAND}
                  height={PLOT_H}
                  fill="transparent"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                />
              </g>
            )
          })}
        </svg>

        {hovered !== null && <Tooltip day={week[hovered]} index={hovered} />}
      </div>
    </div>
  )
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {SERIES.map((s) => (
        <span key={s.key} className="flex items-center gap-2 text-[13px] text-muted">
          <span
            aria-hidden
            className="size-3 rounded-[3px]"
            style={{ background: s.fill }}
          />
          {s.label}
        </span>
      ))}
    </div>
  )
}

function Tooltip({ day, index }: { day: DayTotals; index: number }) {
  // Columns run the full height of the plot, so there is no clear space above a
  // bar to sit in. Park the card beside the hovered column instead — and flip it
  // to the other side for the last two, so it never runs off the card.
  const barLeft = PAD.left + index * BAND + (BAND - BAR_W) / 2
  const flip = index >= 3
  const side = flip
    ? { right: `${100 - (barLeft / W) * 100}%`, marginRight: 10 }
    : { left: `${((barLeft + BAR_W) / W) * 100}%`, marginLeft: 10 }

  return (
    <div
      className="pointer-events-none absolute top-1 z-10 w-[194px] rounded-lg border border-line bg-white p-3 shadow-[0_6px_20px_rgba(26,26,23,0.13)]"
      style={side}
    >
      <p className="text-[13px] font-semibold text-ink">
        {day.day} · {day.date}
      </p>
      <dl className="mt-2 flex flex-col gap-1.5">
        {SERIES.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-[2px]"
              style={{ background: s.fill }}
            />
            <dt className="text-[13px] text-muted">{s.label}</dt>
            <dd className="ml-auto text-[13px] font-semibold text-ink tabular-nums">
              {day[s.key].toLocaleString()}
              <span className="ml-1.5 font-normal text-subtle">
                {pct(day[s.key], ENROLLED)}%
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
