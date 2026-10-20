import Link from "next/link";
import { Sparkles, MessageSquareText, ShieldCheck, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-border-subtle bg-surface/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-text-main">
              PesanRapi
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Masuk
              </Button>
            </Link>
            <Link href="/app">
              <Button size="sm">
                Buka Generator <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 md:py-20 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-pill bg-primary/10 text-primary text-xs font-semibold mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Website Template Pesan Customer Service</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-text-main leading-tight max-w-2xl">
          Kirim Pesan CS Profesional{" "}
          <span className="text-primary">Lebih Cepat & Bebas Khawatir</span>
        </h1>

        <p className="mt-4 text-base sm:text-lg text-text-muted max-w-xl">
          Pilih template, isi formulir dinamis, periksa hasil pratinjau real-time, lalu salin sebagai Teks Biasa atau format WhatsApp dalam hitungan detik.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Link href="/app" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto font-semibold">
              <MessageSquareText className="h-5 w-5 mr-2" />
              Mulai Susun Pesan Sekarang
            </Button>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <Button variant="secondary" size="lg" className="w-full sm:w-auto">
              Masuk ke Akun
            </Button>
          </Link>
        </div>

        {/* Highlight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-16 text-left w-full">
          <Card className="hover:border-primary/40 transition-colors">
            <CardContent className="pt-6">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Zap className="h-5 w-5" />
              </div>
              <h2 className="font-semibold text-base mb-1.5">Kerja Cepat & Efisien</h2>
              <p className="text-sm text-text-muted">
                Formulir menyesuaikan jenis pesan. Cukup ketik data spesifik dan salin langsung ke WhatsApp atau live chat.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/40 transition-colors">
            <CardContent className="pt-6">
              <div className="h-10 w-10 rounded-xl bg-success/10 text-success flex items-center justify-center mb-4">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h2 className="font-semibold text-base mb-1.5">Privasi Zero-Storage</h2>
              <p className="text-sm text-text-muted">
                Data pelanggan dan isi pesan tidak pernah disimpan di server, database, maupun log aplikasi.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/40 transition-colors">
            <CardContent className="pt-6">
              <div className="h-10 w-10 rounded-xl bg-accent/20 text-[#00679E] flex items-center justify-center mb-4">
                <Sparkles className="h-5 w-5" />
              </div>
              <h2 className="font-semibold text-base mb-1.5">Format Teks & WhatsApp</h2>
              <p className="text-sm text-text-muted">
                Salin dengan format bold WhatsApp otomatis atau teks biasa tanpa perlu mengedit penanda manual.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle bg-surface py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs text-text-muted">
          PesanRapi &copy; 2026 &mdash; Solusi template pesan customer service modern & aman.
        </div>
      </footer>
    </div>
  );
}
