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

          {/* Verantwortlicher */}
          <div className="space-y-3 text-sm text-slate-350">
            <h2 className="text-lg font-bold text-slate-200">1. Verantwortlicher im Sinne des Datenschutzrechts</h2>
            <p>
              Verantwortlich für die Datenverarbeitung auf dieser Website ist:
            </p>
            <div className="p-4 bg-slate-950/40 border border-slate-850 rounded-xl">
              <p className="font-semibold text-slate-200">Gagan Dabole</p>
              <p>John-Schehr-Straße 1</p>
              <p>10407 Berlin</p>
              <p>Germany</p>
              <p className="mt-2">E-Mail: <a href="mailto:gagan.dabole@gmail.com" className="text-indigo-400 hover:underline">gagan.dabole@gmail.com</a></p>
            </div>
          </div>

          {/* DSGVO / GDPR Introduction */}
          <div className="space-y-4 text-xs sm:text-sm text-slate-355 leading-relaxed">
            <h2 className="text-lg font-bold text-slate-200">2. Allgemeine Hinweise und Pflichtinformationen</h2>
            <p>
              Der Schutz Ihrer persönlichen Daten ist uns ein wichtiges Anliegen. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften (insb. DSGVO/GDPR) sowie dieser Datenschutzerklärung.
            </p>
            <p>
              Wenn Sie diese Website benutzen, werden verschiedene personenbezogene Daten erhoben. Personenbezogene Daten sind Daten, mit denen Sie persönlich identifiziert werden können. Die vorliegende Datenschutzerklärung erläutert, welche Daten wir erheben, wofür wir sie nutzen und wie dies geschieht.
            </p>
          </div>

          {/* Zero Retention Image Processing Policy */}
          <div className="space-y-4 text-xs sm:text-sm text-slate-355 leading-relaxed">
            <h2 className="text-lg font-bold text-slate-200">3. In-Memory Zero-Retention-Bildverarbeitung (Keine Speicherung von Flyern)</h2>
            <div className="p-4 bg-indigo-950/20 border border-indigo-550/30 rounded-xl space-y-2">
              <p className="font-semibold text-indigo-300">Striktes Zero-Retention-Prinzip:</p>
              <p className="text-slate-300">
                FlyerToCalendar verfolgt ein striktes <strong>Zero-Retention-Prinzip</strong> bezüglich Ihrer hochgeladenen Bilddateien. 
                Sämtliche hochgeladenen Flyer und Terminpläne werden ausschließlich flüchtig im Arbeitsspeicher verarbeitet, um den Text und die Veranstaltungsdetails per Google Gemini API zu extrahieren. 
              </p>
              <p className="text-slate-300">
                Es erfolgt <strong>keine dauerhafte Speicherung oder Archivierung</strong> Ihrer Bilder auf unseren Servern, Datenbanken oder Speichermedien. Nach der Verarbeitung und Rückmeldung der strukturierten Kalenderdaten werden die Bilddaten umgehend aus dem Speicher verworfen.
              </p>
            </div>
          </div>

          {/* Hosting and Cloud Infrastructure Disclosures */}
          <div className="space-y-4 text-xs sm:text-sm text-slate-355 leading-relaxed">
            <h2 className="text-lg font-bold text-slate-200">4. Hoster und Cloud-Infrastruktur</h2>
            
            <div className="space-y-2">
              <h3 className="font-bold text-slate-300">Vercel (Hosting der Anwendung)</h3>
              <p>
                Wir hosten unsere Anwendung bei <strong>Vercel Inc.</strong> (340 S Lemon Ave #4133, Walnut, CA 91789, USA). 
                Beim Besuch unserer Seite erfasst Vercel zur Sicherstellung des Betriebs Verbindungsdaten (z. B. IP-Adresse, Browsertyp, Zugriffszeiten). 
                Weitere Details finden Sie in der Datenschutzerklärung von Vercel unter: <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">https://vercel.com/legal/privacy-policy</a>.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-slate-300">Supabase (Edge Compute & Storage)</h3>
              <p>
                Für die Ausführung der Backend-Logik nutzen wir Serverless Edge Functions von <strong>Supabase Inc.</strong> (Singapore / USA). 
                Die hochgeladenen Bilddaten werden verschlüsselt an die Edge-Funktion weitergeleitet, dort im flüchtigen RAM verarbeitet und verworfen. 
                Datenschutzerklärung von Supabase: <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">https://supabase.com/privacy</a>.
              </p>
            </div>
          </div>

          {/* Third Party API Integration - Gemini */}
          <div className="space-y-4 text-xs sm:text-sm text-slate-355 leading-relaxed">
            <h2 className="text-lg font-bold text-slate-200">5. KI-Verarbeitung (Google Gemini API)</h2>
            <p>
              Zur automatischen Erkennung und Strukturierung von Veranstaltungsdaten leitet unsere Edge-Funktion den Bildinhalt (in Form eines flüchtigen Base64-Datenstroms) an die <strong>Google Gemini API</strong> (Google Cloud / Google LLC, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA) weiter.
            </p>
            <p>
              Die Übermittlung erfolgt verschlüsselt unter Einhaltung strenger Sicherheitsrichtlinien. Google verarbeitet diese Daten ausschließlich im Auftrag, um den Service zur Verfügung zu stellen. Die übertragenen Bilddaten werden nicht für das Training zukünftiger Google-KI-Modelle verwendet.
            </p>
          </div>

          {/* Rights of Data Subjects */}
          <div className="space-y-4 text-xs sm:text-sm text-slate-355 leading-relaxed">
            <h2 className="text-lg font-bold text-slate-200">6. Rechte der betroffenen Person (Art. 15-21 DSGVO)</h2>
            <p>
              Sie haben nach der DSGVO folgende Rechte bezüglich Ihrer personenbezogenen Daten:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-300 text-xs">
              <li><strong>Recht auf Auskunft (Art. 15 DSGVO):</strong> Sie können Auskunft über Ihre von uns verarbeiteten personenbezogenen Daten verlangen.</li>
              <li><strong>Recht auf Berichtigung (Art. 16 DSGVO):</strong> Sie können die Vervollständigung oder Berichtigung unrichtiger Daten verlangen.</li>
              <li><strong>Recht auf Löschung (Art. 17 DSGVO):</strong> Sie können die Löschung Ihrer bei uns gespeicherten Daten verlangen (z. B. Ihre E-Mail, falls Sie sich in die Warteliste eingetragen haben).</li>
              <li><strong>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO):</strong> Sie können unter bestimmten Voraussetzungen die Einschränkung der Verarbeitung Ihrer Daten verlangen.</li>
              <li><strong>Recht auf Datenübertragbarkeit (Art. 20 DSGVO):</strong> Sie können verlangen, Ihre Daten in einem strukturierten, gängigen und maschinenlesbaren Format zu erhalten.</li>
              <li><strong>Recht auf Widerspruch (Art. 21 DSGVO):</strong> Sie können der Datenverarbeitung widersprechen, falls diese auf Grundlage von berechtigten Interessen erfolgt.</li>
            </ul>
            <p className="mt-2 text-xs">
              Wenden Sie sich hierzu oder zu weiteren Fragen zum Thema Datenschutz gerne an die im Impressum angegebene E-Mail-Adresse. Sie haben zudem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
