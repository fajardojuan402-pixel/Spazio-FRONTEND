export default function Footer() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-sm text-subtle sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <p>© 2026 SPAZIO · Tu espacio en la ciudad</p>
        <nav className="flex gap-6">
          <a href="#" className="hover:text-ink">Centro de ayuda</a>
          <a href="#" className="hover:text-ink">Términos de uso</a>
          <a href="#" className="hover:text-ink">Privacidad</a>
        </nav>
      </div>
    </footer>
  )
}
