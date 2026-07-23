import Link from "next/link";

export const metadata = {
  title: "Impressum - FlyerToCalendar",
  description: "Legal imprint / Impressum for FlyerToCalendar.",
};

export default function Impressum() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start p-6 md:p-12 selection:bg-indigo-500 selection:text-white">
      <div className="max-w-2xl w-full space-y-8 mt-6">
        {/* Navigation back home */}
        <div className="text-left">
          <Link
            href="/"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1.5"
          >
            ← Back to Home
          </Link>
        </div>

        <div className="bg-slate-900/60 border border-slate-850 rounded-2xl p-8 shadow-xl space-y-6 backdrop-blur-md text-left">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Impressum
          </h1>
          <p className="text-sm text-slate-400">
            Angaben gemäß § 5 DDG.
          </p>

          <hr className="border-slate-800" />

          {/* Contact Details */}
          <div className="space-y-5 text-sm text-slate-350">
            <div>
              <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-1">Diensteanbieter / Betreiber</h2>
              <p className="font-semibold text-slate-200 text-base">Gagan Dabole</p>
              <p>John-Schehr-Straße 1</p>
              <p>10407 Berlin</p>
              <p>Germany</p>
            </div>

            <div>
              <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-1">Rechtsform</h2>
              <p>Einzelunternehmen</p>
              <p className="text-slate-400 text-xs mt-1">
                Gemäß § 19 UStG (Kleinunternehmerregelung) wird keine Umsatzsteuer ausgewiesen und berechnet.
              </p>
            </div>

            <div>
              <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-1">Kontakt</h2>
              <p>E-Mail: <a href="mailto:gagan.dabole@gmail.com" className="text-indigo-400 font-semibold hover:underline">gagan.dabole@gmail.com</a></p>
            </div>

            <div>
              <h2 className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-1">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
              <p className="font-semibold text-slate-200">Gagan Dabole</p>
              <p>John-Schehr-Straße 1</p>
              <p>10407 Berlin</p>
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* Disclaimer section */}
          <div className="space-y-4 text-xs text-slate-450 leading-relaxed">
            <h2 className="text-sm font-bold text-slate-300">Haftungsausschluss (Disclaimer)</h2>
            
            <div className="space-y-2">
              <h3 className="font-bold text-slate-400">Haftung für Inhalte</h3>
              <p>
                Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur erhaltenen Löschung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-slate-400">Haftung für Links</h3>
              <p>
                Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-slate-400">Urheberrecht</h3>
              <p>
                Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
