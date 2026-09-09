'use client';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center bg-zinc-900 text-zinc-100">
      <h1 className="text-3xl font-bold mb-3">Algo salió mal</h1>
      <p className="text-zinc-400 mb-6 text-sm max-w-md">
        Ocurrió un error inesperado al procesar la solicitud.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors"
      >
        Reintentar
      </button>
    </div>
  );
}
