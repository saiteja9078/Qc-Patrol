import { Navbar } from './Navbar'

export function PageWrapper({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(title || subtitle) && (
          <div className="mb-8">
            {title && (
              <h1 className="text-2xl font-bold text-text-primary font-jp">{title}</h1>
            )}
            {subtitle && (
              <p className="text-text-muted mt-1 text-sm font-jp">{subtitle}</p>
            )}
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
