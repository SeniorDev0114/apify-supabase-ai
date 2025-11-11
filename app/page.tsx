export default function HomePage() {
  return (
    <main className="px-6 py-16 max-w-5xl mx-auto">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-white/70 to-gray-50/60 dark:from-neutral-900/70 dark:to-neutral-950/60 p-10 shadow-sm">
        <div className="relative z-10 max-w-3xl">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
            Apify → Supabase → OpenAI
          </h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-300">
            Ingest web content with Apify, store securely in Supabase, and extract insights with OpenAI. Manage and analyze your records with a simple UI.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/records"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 text-white shadow-sm hover:shadow-md hover:bg-violet-700 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-violet-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 4.5A1.5 1.5 0 014.5 3h11A1.5 1.5 0 0117 4.5v11a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013 15.5v-11zM6 7h8v2H6V7zm0 4h8v2H6v-2z" />
              </svg>
              View Records
            </a>
            <a
              href="/health"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-gray-900 border shadow-sm hover:shadow-md transition-shadow dark:bg-neutral-950 dark:text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-violet-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 10a7 7 0 1114 0A7 7 0 013 10zm6-3a1 1 0 100 2h2a1 1 0 100-2H9z" />
              </svg>
              System Health
            </a>
          </div>
        </div>

        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />
      </section>
    </main>
  );
}
