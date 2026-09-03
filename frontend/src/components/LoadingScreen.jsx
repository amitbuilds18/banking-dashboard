export default function LoadingScreen({ message = "Loading..." }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-700 bg-slate-900/80 px-8 py-6 shadow-2xl">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />
        <p className="text-lg font-medium text-slate-200">{message}</p>
      </div>
    </div>
  );
}
