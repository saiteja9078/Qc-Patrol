export function Badge({ children, variant = 'info' }) {
  const variants = {
    success: 'badge-success',
    warning: 'badge-warning',
    info: 'badge-info',
  }
  return <span className={variants[variant]}>{children}</span>
}
