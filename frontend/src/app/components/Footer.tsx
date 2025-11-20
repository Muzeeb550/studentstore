import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white mt-20 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M30 30c0-16.569 13.431-30 30-30v60c-16.569 0-30-13.431-30-30z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-16 relative z-10">
        {/* All your existing sections remain the same... */}
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-student-orange to-red-500 bg-clip-text text-transparent">
              Stop Wasting Money
            </span>
            <br />
            <span className="text-white">on Products That</span>{" "}
            <span className="bg-gradient-to-r from-red-500 to-student-orange bg-clip-text text-transparent">
              Don't Work for Students.
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-200 max-w-4xl mx-auto leading-relaxed font-semibold">
            Tired of buying stuff based on random reviews? <strong className="bg-gradient-to-r from-student-orange to-student-blue bg-clip-text text-transparent">Other students already tested everything you need.</strong> Now you can <strong className="text-white">shop with insider knowledge.</strong>
          </p>
        </div>

        {/* Why Smart Students Choose Section */}
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-8">
            <span className="bg-gradient-to-r from-student-blue to-student-green bg-clip-text text-transparent">
              Why Smart Students
            </span>{" "}
            <span className="text-white">Choose StudentStore</span>
          </h2>
          
          <div className="bg-slate-800/90 backdrop-blur-sm rounded-3xl p-6 md:p-10 border border-slate-700 shadow-2xl mb-8">
            <p className="text-lg md:text-xl text-gray-200 leading-relaxed mb-6 text-center font-medium">
              Finally, an app <strong className="text-white">built by students, for students</strong>. No more scrolling through confusing reviews from random people who have nothing in common with your student life. Here, every recommendation comes from someone who <strong className="bg-gradient-to-r from-student-orange to-student-blue bg-clip-text text-transparent">actually gets it.</strong>
            </p>
            
            <p className="text-base md:text-lg text-gray-200 leading-relaxed text-center">
              <strong className="text-white">Your fellow students have already done the research:</strong> The best laptop that survived four years of college abuse. The perfect backpack that fits everything without breaking your shoulders. The study gear that actually helped boost grades. The style essentials that made them feel confident on campus.
            </p>
          </div>
        </div>

        {/* Why StudentStore Works */}
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-8">
            <span className="bg-gradient-to-r from-student-green to-student-blue bg-clip-text text-transparent">
              Why StudentStore
            </span>{" "}
            <span className="text-white">Works</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-w-4xl mx-auto">
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-slate-700 shadow-xl">
              <div className="flex items-start">
                <div className="bg-gradient-to-r from-student-green to-student-blue rounded-full p-2 mr-4 mt-1">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg md:text-xl font-bold text-white">student reviews from real student experiences</h3>
              </div>
            </div>
            
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-slate-700 shadow-xl">
              <div className="flex items-start">
                <div className="bg-gradient-to-r from-student-orange to-student-blue rounded-full p-2 mr-4 mt-1">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg md:text-xl font-bold text-white">Curated products that actually enhance student life</h3>
              </div>
            </div>
            
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-slate-700 shadow-xl">
              <div className="flex items-start">
                <div className="bg-gradient-to-r from-student-green to-student-orange rounded-full p-2 mr-4 mt-1">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg md:text-xl font-bold text-white">Coming soon: Career courses to give you the edge</h3>
              </div>
            </div>
          </div>
        </div>

        {/* The Difference */}
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-8">
            <span className="text-white">The</span>{" "}
            <span className="bg-gradient-to-r from-student-orange to-student-blue bg-clip-text text-transparent">
              Difference
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl p-6 border border-red-500/30 shadow-xl">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                  😵
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-red-400 mb-3">Regular Students</h3>
                <p className="text-lg font-semibold text-gray-300">Waste money on trial-and-error shopping</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-student-blue/20 to-student-green/20 backdrop-blur-sm rounded-2xl p-6 border border-student-green/40 shadow-xl">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-student-blue to-student-green rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                  😎
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-student-green mb-3">StudentStore Users</h3>
                <p className="text-lg font-semibold text-white">Know exactly what works before buying</p>
              </div>
            </div>
          </div>
        </div>

        {/* While Others Regret */}
        <div className="mb-16">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-black mb-8">
              <span className="text-gray-300">While others regret their purchases...</span>
            </h2>
            
            <div className="bg-gradient-to-r from-student-blue/20 to-student-green/20 backdrop-blur-sm rounded-3xl p-6 md:p-10 border border-student-blue/30 shadow-2xl">
              <p className="text-xl md:text-2xl text-gray-200 leading-relaxed mb-6 font-semibold">
                <strong className="bg-gradient-to-r from-student-orange to-student-blue bg-clip-text text-transparent">You'll be shopping with insider knowledge.</strong> Every product has been vetted by students who understand the struggle – tight budgets, demanding schedules, and the need for things that actually work in student life.
              </p>
              
              <p className="text-lg md:text-xl text-gray-200 leading-relaxed font-medium">
                This isn't just another shopping app. <strong className="text-white">This is your competitive edge.</strong> While your classmates waste time and money on trial-and-error shopping, you'll have instant access to the <strong className="bg-gradient-to-r from-student-green to-student-blue bg-clip-text text-transparent">proven winners</strong> – tested by students, approved by students, recommended by students.
              </p>
            </div>
          </div>
        </div>

        {/* Ready to Shop Smarter */}
        <div className="mb-12">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-black mb-8">
              <span className="text-white">Ready to</span>{" "}
              <span className="bg-gradient-to-r from-student-orange to-student-blue bg-clip-text text-transparent">
                Shop Smarter?
              </span>
            </h2>
            
            <div className="bg-slate-800/90 backdrop-blur-sm rounded-3xl p-6 md:p-10 border border-slate-700 shadow-2xl mb-8">
              <p className="text-xl md:text-2xl text-gray-200 leading-relaxed mb-8 font-semibold">
                Make StudentStore your personalized app before any purchase. <strong className="bg-gradient-to-r from-student-green to-student-blue bg-clip-text text-transparent">Your wallet, your grades, and your future self will thank you.</strong>
              </p>
              
              <div className="bg-gradient-to-r from-student-orange/20 to-student-blue/20 rounded-2xl p-6 border border-student-orange/30">
                <div className="flex items-center justify-center mb-4">
                  <img 
                    src="/favicon-96x96.png" 
                    alt="StudentStore Logo" 
                    className="w-12 h-12 object-contain mr-4"
                  />
                  <span className="text-2xl md:text-3xl font-black bg-gradient-to-r from-student-orange to-student-blue bg-clip-text text-transparent">
                    Install StudentStore now
                  </span>
                </div>
                <p className="text-lg md:text-xl font-bold text-center">
                  <span className="text-gray-200">– because smart students don't settle for average products –</span>{" "}
                  <span className="bg-gradient-to-r from-student-green to-student-blue bg-clip-text text-transparent">
                    You deserve better.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ UPDATED: Bottom Section with Links */}
        <div className="border-t border-slate-700 pt-8">
          {/* Quick Links & Social */}
          <div className="max-w-5xl mx-auto mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 text-center sm:text-left">
              {/* Quick Links */}
              <div>
                <h4 className="text-lg font-bold text-white mb-3">Quick Links</h4>
                <ul className="space-y-2">
                  <li>
                    <Link href="/about" className="text-gray-300 hover:text-student-blue transition-colors text-sm sm:text-base">
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link href="/privacy" className="text-gray-300 hover:text-student-blue transition-colors text-sm sm:text-base">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="text-gray-300 hover:text-student-blue transition-colors text-sm sm:text-base">
                      Terms of Service
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Connect With Us */}
              <div>
                <h4 className="text-lg font-bold text-white mb-3">Connect With Us</h4>
                <ul className="space-y-2">
                  <li>
                    <a 
                      href="https://instagram.com/studentstore.official" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-300 hover:text-student-orange transition-colors flex items-center justify-center sm:justify-start text-sm sm:text-base"
                    >
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                      Instagram
                    </a>
                  </li>
                  <li>
                    <a 
                      href="mailto:studentstoreforstudents@gmail.com"
                      className="text-gray-300 hover:text-student-green transition-colors flex items-center justify-center sm:justify-start text-sm sm:text-base"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Support Email
                    </a>
                  </li>
                </ul>
              </div>

              {/* For Students */}
              <div>
                <h4 className="text-lg font-bold text-white mb-3">For Students</h4>
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                  Smart shopping decisions, student-tested products, career guidance – all in one place.
                </p>
              </div>

              {/* Affiliate Disclosure */}
              <div>
                <h4 className="text-lg font-bold text-white mb-3">Disclosure</h4>
                <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                  We may earn a small commission from purchases through our links. This helps keep StudentStore free for students!
                </p>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-center border-t border-slate-700 pt-6">
            <p className="text-gray-300 font-medium text-sm sm:text-base flex flex-col sm:flex-row items-center justify-center">
              <span className="flex items-center mb-2 sm:mb-0">
                <span className="mr-2">©</span> 2025 StudentStore.
              </span>
              <span className="flex items-center">
                Made with <span className="mx-2 text-red-400 text-lg">❤️</span> by students, for students everywhere.
              </span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
