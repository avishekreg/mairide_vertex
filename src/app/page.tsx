import Link from 'next/link';
import { Car, ShieldCheck, Zap, Wallet } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="bg-[#F6F3C2] min-h-screen text-[#4B9DA9]">
      <nav className="p-6 flex justify-between items-center max-w-6xl mx-auto">
        <h1 className="text-2xl font-extrabold tracking-tight">MaiRide</h1>
        <Link href="/dashboard" className="bg-[#4B9DA9] text-white px-6 py-2 rounded-full font-bold hover:bg-[#3A7E88]">Dashboard</Link>
      </nav>

      <header className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="text-6xl font-extrabold mb-6 text-[#E37434]">Long-distance rides,<br/>made simple & affordable.</h2>
        <p className="text-xl mb-10 text-slate-700 max-w-2xl mx-auto">Connect with verified drivers and save 50% on intercity travel.</p>
        <Link href="/login" className="bg-[#E37434] text-white px-10 py-5 rounded-full font-bold text-lg hover:scale-105 transition shadow-lg">Start Saving Today →</Link>
      </header>
    </main>
  );
}