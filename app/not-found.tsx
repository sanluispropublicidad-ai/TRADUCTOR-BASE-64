import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center bg-zinc-900 text-zinc-100">
      <h1 className="text-4xl font-bold mb-3">404 - Página no encontrada</h1>
      <p className="text-zinc-400 mb-6 text-sm max-w-md">
        La ruta a la que intentas acceder no existe en el sistema de Prompt Translator.
      </p>
      <Link
        href="/"
        className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors inline-block"
      >
        Volver al Estudio
      </Link>
    </div>
  );
}
