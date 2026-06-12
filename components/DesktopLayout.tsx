export default function DesktopLayout({ leftContent, children }: {
  leftContent: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="min-h-[100dvh] flex">
      {/* Panel izquierdo — solo desktop */}
      <div className="hidden lg:flex lg:w-[42%] lg:fixed lg:inset-y-0 lg:left-0
                      bg-mc-azul-marino flex-col items-center justify-center
                      px-12 py-16">
        {leftContent}
      </div>

      {/* Contenido derecho */}
      <div className="w-full lg:ml-[42%] lg:w-[58%] min-h-[100dvh] bg-white overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
