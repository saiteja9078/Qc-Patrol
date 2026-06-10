/**
 * CheckToggle — two-button toggle for 問題無し / 改善
 * value: true = 問題無し (ok), false = 改善 (improvement), null = unset
 */
export function CheckToggle({ value, onChange, disabled = false }) {
  return (
    <div className="flex gap-1 justify-center">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(value === true ? null : true)}
        className={`toggle-ok text-[10px] px-1.5 py-0.5 ${
          value === true ? 'toggle-ok-active' : 'toggle-ok-inactive'
        }`}
        title="問題無し"
      >
        ✓ OK
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(value === false ? null : false)}
        className={`toggle-ok text-[10px] px-1.5 py-0.5 ${
          value === false ? 'toggle-imp-active' : 'toggle-imp-inactive'
        }`}
        title="改善"
      >
        △ 改善
      </button>
    </div>
  )
}
