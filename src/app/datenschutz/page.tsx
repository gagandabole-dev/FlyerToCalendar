import Link from "next/link";

export const metadata = {
  title: "Datenschutzerklärung - FlyerToCalendar",
  description: "Privacy Policy (Datenschutzerklärung) for FlyerToCalendar.",
};

export default function Datenschutz() {
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
            Datenschutzerklärung (Privacy Policy)
          </h1>
          <p className="text-sm text-slate-400">
            Stand: Juli 2026
          </p>

          <hr className="border-slate-800" />

          {/* DSGVO / GDPR Introduction */}
          <div className="space-y-4 text-xs sm:text-sm text-slate-355 leading-relaxed">
            <h2 className="text-lg font-bold text-slate-200">1. Allgemeine Hinweise und Pflichtinformationen</h2>
            <p>
              Der Schutz Ihrer persönlichen Daten ist uns ein wichtiges Anliegen. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften (insb. DSGVO/GDPR) sowie dieser Datenschutzerklärung.
            </p>
            <p>
              Wenn Sie diese Website benutzen, werden verschiedene personenbezogene Daten erhoben. Personenbezogene Daten sind Daten, mit denen Sie persönlich identifiziert werden können. Die vorliegende Datenschutzerklärung erläutert, welche Daten wir erheben, wofür wir sie nutzen und wie dies geschieht.
            </p>
          </div>

          {/* Zero Retention Image Processing Policy */}
          <div className="space-y-4 text-xs sm:text-sm text-slate-355 leading-relaxed">
            <h2 className="text-lg font-bold text-slate-200">2. Zero-Retention-Bildverarbeitung (Keine Speicherung von Flyern)</h2>
            <div className="p-4 bg-indigo-950/20 border border-indigo-550/30 rounded-xl space-y-2">
              <p className="font-semibold text-indigo-300">Wichtiger Hinweis zum Datenschutz:</p>
              <p className="text-slate-300">
                FlyerToCalendar verfolgt ein striktes <strong>Zero-Retention-Prinzip</strong> bezüglich Ihrer hochgeladenen Bilddateien. 
                Sämtliche hochgeladenen Flyer und Terminpläne werden ausschließlich flüchtig im Arbeitsspeicher verarbeitet, um den Text und die Veranstaltungsdetails per KI zu extrahieren. 
                Es erfolgt <strong>keine dauerhafte Speicherung oder Archivierung</strong> Ihrer Bilder auf unseren Servern, Datenbanken oder Speichermedien. Nach der Verarbeitung und Rückmeldung der strukturierten Kalenderdaten werden die Bilddaten umgehend aus dem Speicher verworfen.
              </p>
            </div>
          </div>

          {/* Hosting and Cloud Infrastructure Disclosures */}
          <div className="space-y-4 text-xs sm:text-sm text-slate-355 leading-relaxed">
            <h2 className="text-lg font-bold text-slate-200">3. Hoster und Cloud-Infrastruktur</h2>
            
            <div className="space-y-2">
              <h3 className="font-bold text-slate-300">Vercel Hosting</h3>
              <p>
                Wir hosten unsere Anwendung bei <strong>Vercel</strong> (Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA). 
                Vercel ist ein Cloud-Service-Provider, der Webseiten ausliefert. Beim Besuch unserer Seite erfasst Vercel zur Sicherstellung des Betriebs Verbindungsdaten (z. B. IP-Adresse, Browsertyp, Zugriffszeiten). 
                Weitere Details finden Sie in der Datenschutzerklärung von Vercel unter: <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">https://vercel.com/legal/privacy-policy</a>.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-slate-300">Supabase (Datenbank & Edge Functions)</h3>
              <p>
                Für die Ausführung der Backend-Logik nutzen wir Serverless Edge Functions von <strong>Supabase</strong> (Supabase Inc., Singapore / USA). 
                Die hochgeladenen Bilddaten werden verschlüsselt an die Edge-Funktion weitergeleitet, dort im flüchtigen RAM verarbeitet und verworfen. 
                Datenschutzerklärung von Supabase: <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">https://supabase.com/privacy</a>.
              </p>
            </div>
          </div>

          {/* Third Party API Integration - Gemini */}
          <div className="space-y-4 text-xs sm:text-sm text-slate-355 leading-relaxed">
            <h2 className="text-lg font-bold text-slate-200">4. KI-Verarbeitung (Google Gemini API)</h2>
            <p>
              Zur automatischen Erkennung und Strukturierung von Veranstaltungsdaten leitet unsere Edge-Funktion den Bildinhalt (in Form eines flüchtigen Base64-Datenstroms) an die <strong>Google Gemini API</strong> (Google Cloud / Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA) weiter.
            </p>
            <p>
              Die Übermittlung erfolgt verschlüsselt unter Einhaltung strenger Sicherheitsrichtlinien. Google verarbeitet diese Daten ausschließlich im Auftrag, um den Service zur Verfügung zu stellen. Die übertragenen Bilddaten werden nicht für das Training zukünftiger Google-KI-Modelle verwendet.
            </p>
          </div>

          {/* User Rights */}
          <div className="space-y-4 text-xs sm:text-sm text-slate-355 leading-relaxed">
            <h2 className="text-lg font-bold text-slate-200">5. Ihre Rechte (Betroffenenrechte)</h2>
            <p>
              Sie haben im Rahmen der geltenden gesetzlichen Bestimmungen jederzeit das Recht auf unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen Daten, deren Herkunft und Empfänger und den Zweck der Datenverarbeitung und ggf. ein Recht auf Berichtigung, Sperrung oder Löschung dieser Daten.
            </p>
            <p>
              Da wir Flyer-Bilder nicht speichern und keine Benutzerkonten führen, speichern wir in der Regel keine identifizierbaren Nutzungsdaten von Ihnen. Falls Sie sich in unsere Warteliste eingetragen haben, können Sie der Speicherung Ihrer E-Mail-Adresse jederzeit widersprechen, woraufhin wir diese umgehend löschen.
            </p>
            <p>
              Wenden Sie sich hierzu oder zu weiteren Fragen zum Thema Datenschutz gerne an die im Impressum angegebene E-Mail-Adresse.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
