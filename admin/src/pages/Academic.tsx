import { useState } from 'react'
import { GraduationCap, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  GRADE_LEVELS,
  SCHOOL,
  SECTION_ROWS,
  STRANDS,
  type SectionRow,
} from '../lib/mock'
import {
  Badge,
  Button,
  Card,
  CardTitle,
  DataPoint,
  Field,
  IconButton,
  PageHeader,
  Select,
} from '../components/ui'

export function Academic() {
  const [grade, setGrade] = useState('')

  const rows = grade
    ? SECTION_ROWS.filter((s) => s.gradeLevel === grade)
    : SECTION_ROWS
  const enrolled = rows.reduce((sum, s) => sum + s.enrolled, 0)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Academic Setup"
        description="The school year, grade levels, sections and strands the rest of the system reads from."
      >
        <Button variant="primary">
          <Plus size={18} strokeWidth={2.4} />
          Add section
        </Button>
      </PageHeader>

      <Card className="flex flex-wrap items-center justify-between gap-6 p-6">
        <div className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <GraduationCap size={24} strokeWidth={1.8} />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-semibold tracking-wide text-muted uppercase">
              Active school year
            </span>
            <span className="display-title text-[32px] leading-none text-ink">
              {SCHOOL.schoolYear}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
          <DataPoint label="School ID" value={SCHOOL.schoolId} />
          <DataPoint label="Grade levels" value={String(GRADE_LEVELS.length)} />
          <DataPoint label="Sections" value={String(SECTION_ROWS.length)} />
          <DataPoint label="Strands" value={String(STRANDS.length)} />
        </div>

        <Button size="sm">Change school year</Button>
      </Card>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-4 px-6 pt-6 pb-5">
            <div className="flex flex-col gap-1">
              <CardTitle>Sections</CardTitle>
              <p className="text-sm text-muted">
                {rows.length} sections · {enrolled.toLocaleString()} learners
              </p>
            </div>
            <Field label="Grade level" htmlFor="grade" className="w-[170px]">
              <Select
                id="grade"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              >
                <option value="">All grades</option>
                {GRADE_LEVELS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <table className="w-full table-fixed border-collapse text-left">
            <colgroup>
              <col />
              <col className="w-[120px]" />
              <col className="w-[110px]" />
              <col className="w-[100px]" />
              <col className="w-[100px]" />
            </colgroup>
            <thead>
              <tr className="border-y border-line-soft text-[13px] font-semibold tracking-wide text-muted uppercase">
                <th scope="col" className="py-3 pl-6">
                  Section
                </th>
                <th scope="col" className="py-3">
                  Grade
                </th>
                <th scope="col" className="py-3">
                  Strand
                </th>
                <th scope="col" className="py-3 text-right">
                  Learners
                </th>
                <th scope="col" className="py-3 pr-6 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <SectionTableRow key={s.id} section={s} />
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center text-muted">
                    No sections for that grade level yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <div className="flex flex-col gap-6">
          <ListCard
            title="Grade levels"
            description="Junior high is Grades 7–10; senior high is 11–12."
            items={GRADE_LEVELS}
          />
          <ListCard
            title="Strands"
            description="Offered to senior high only. The registrar form hides this field for Grades 7–10."
            items={STRANDS}
          />
        </div>
      </div>
    </div>
  )
}

function SectionTableRow({ section }: { section: SectionRow }) {
  return (
    <tr className="border-b border-line-soft last:border-b-0 hover:bg-cream/60">
      <td className="py-3 pr-4 pl-6">
        <div className="flex flex-col">
          <span className="text-[15px] font-semibold text-ink">
            {section.name}
          </span>
          <span className="text-[13px] text-muted">
            Adviser: {section.adviser}
          </span>
        </div>
      </td>
      <td className="py-3 pr-4 text-[15px] text-muted">{section.gradeLevel}</td>
      <td className="py-3 pr-4">
        {section.strand ? (
          <Badge tone="info">{section.strand}</Badge>
        ) : (
          <span className="text-[15px] text-subtle">—</span>
        )}
      </td>
      <td className="py-3 pr-4 text-right text-[15px] text-ink tabular-nums">
        {section.enrolled}
      </td>
      <td className="py-3 pr-6">
        <div className="flex items-center justify-end gap-2">
          <IconButton label={`Edit ${section.name}`}>
            <Pencil size={15} strokeWidth={1.9} />
          </IconButton>
          <IconButton label={`Delete ${section.name}`}>
            <Trash2 size={15} strokeWidth={1.9} />
          </IconButton>
        </div>
      </td>
    </tr>
  )
}

function ListCard({
  title,
  description,
  items,
}: {
  title: string
  description: string
  items: string[]
}) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-3">
        <CardTitle>{title}</CardTitle>
        <IconButton label={`Add to ${title.toLowerCase()}`}>
          <Plus size={16} strokeWidth={2.2} />
        </IconButton>
      </div>
      <p className="mt-1.5 text-[13px] leading-snug text-muted">
        {description}
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-md border border-line bg-cream px-2.5 py-1.5 text-[14px] font-medium text-ink"
          >
            {item}
          </li>
        ))}
      </ul>
    </Card>
  )
}
