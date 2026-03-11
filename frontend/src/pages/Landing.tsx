import React from 'react';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { LogoTicker } from '../components/LogoTicker';
import { Features } from '../components/Features';
import { Showcase } from '../components/Showcase';
import { HowItWorks } from '../components/HowItWorks';
import { Templates } from '../components/Templates';
import { Testimonials } from '../components/Testimonials';
import { FAQ } from '../components/FAQ';
import { Pricing } from '../components/Pricing';
import { Footer } from '../components/Footer';

export function Landing() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#0A0A0A] font-sans">
      <Header />
      <main>
        <Hero />
        <LogoTicker />
        <Features />
        <Showcase />
        <HowItWorks />
        <Templates />
        <Testimonials />
        <FAQ />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
