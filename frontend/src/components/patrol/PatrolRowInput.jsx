import { CheckToggle } from './CheckToggle'

export function PatrolRowInput({ row, index, onChange, onDelete, disabled }) {
  const set = (field, val) => onChange(index, { ...row, [field]: val })

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-2 py-1.5 text-center text-text-muted text-xs w-8">
        {row.row_order}
      </td>
      <td className="px-1 py-1">
        <input
          type="text"
          value={row.product_name || ''}
          onChange={(e) => set('product_name', e.target.value)}
          placeholder="品名を入力"
          disabled={disabled}
          className="w-full input-field text-xs py-1.5"
        />
      </td>
      <td className="px-1 py-1 text-center">
        <CheckToggle value={row.check1_ok} onChange={(v) => set('check1_ok', v)} disabled={disabled} />
      </td>
      <td className="px-1 py-1 text-center">
        <CheckToggle value={row.check2_ok} onChange={(v) => set('check2_ok', v)} disabled={disabled} />
      </td>
      <td className="px-1 py-1 text-center">
        <CheckToggle value={row.check3_ok} onChange={(v) => set('check3_ok', v)} disabled={disabled} />
      </td>
      <td className="px-1 py-1 text-center">
        <CheckToggle value={row.check4_ok} onChange={(v) => set('check4_ok', v)} disabled={disabled} />
      </td>
      <td className="px-1 py-1">
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={row.check5_needs_improvement}
              onChange={(e) => set('check5_needs_improvement', e.target.checked)}
              disabled={disabled}
              className="rounded border-border text-warning focus:ring-warning"
            />
            <span className="text-[10px] text-warning font-medium">改善</span>
          </label>
          {row.check5_needs_improvement && (
            <input
              type="text"
              value={row.check5_note || ''}
              onChange={(e) => set('check5_note', e.target.value)}
              placeholder="改善内容"
              disabled={disabled}
              className="input-field text-[10px] py-1"
            />
          )}
        </div>
      </td>
      <td className="px-1 py-1 text-center">
        <button
          type="button"
          onClick={() => onDelete(index)}
          disabled={disabled}
          className="text-danger hover:text-red-700 disabled:opacity-30 transition-colors"
          title="行を削除"
          aria-label={`行 ${row.row_order} を削除`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </td>
    </tr>
  )
}
