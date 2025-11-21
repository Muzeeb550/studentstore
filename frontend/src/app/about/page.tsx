import Link from 'next/link';

export const metadata = {
  title: 'About Us - StudentStore',
  description: 'Learn about StudentStore - Made by students, for students. Our story, mission, and why we built this app.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-student-blue to-student-green py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4">
            About StudentStore
          </h1>
          <p className="text-xl md:text-2xl text-white/90 font-semibold">
            Made by students, for students everywhere.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        
        {/* Our Story */}
        <section className="mb-12 md:mb-16">
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-gray-200">
            <h2 className="text-3xl md:text-4xl font-black mb-6 bg-gradient-to-r from-student-orange to-student-blue bg-clip-text text-transparent">
              Our Story: Why We Built This
            </h2>
            
            <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed space-y-4">
              <p className="text-lg md:text-xl font-semibold text-gray-900">
                We're students, just like you. And we've been through the struggle.
              </p>
              
              <p>
                Remember that time you needed a laptop for college? You spent <strong>hours scrolling through Amazon reviews</strong> written by people who have nothing in common with your student life. A software engineer's laptop needs are different from a design student's. A working professional's budget is different from yours.
              </p>
              
              <p className="text-lg font-semibold text-gray-900">We've all been there:</p>
              <ul className="space-y-2 text-gray-700">
                <li>❌ Buying a bag that looked perfect online, but broke after one semester</li>
                <li>❌ Choosing a mobile phone based on 5-star reviews, only to realize it drains battery during back-to-back classes</li>
                <li>❌ Purchasing study materials that didn't actually help improve grades</li>
                <li>❌ Wasting money on products that "worked for someone else" but not for students</li>
              </ul>
              
              <p className="text-lg font-semibold text-red-600">
                And the worst part? <span className="text-gray-900">No one guided us. No seniors. No mentors. No one who truly understood student life.</span>
              </p>
            </div>
          </div>
        </section>

        {/* The Turning Point */}
        <section className="mb-12 md:mb-16">
          <div className="bg-gradient-to-r from-student-blue/10 to-student-green/10 rounded-3xl shadow-lg p-6 md:p-10 border border-student-blue/20">
            <h2 className="text-3xl md:text-4xl font-black mb-6 text-gray-900">
              The Turning Point
            </h2>
            
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed mb-6">
              After countless bad purchases and empty wallets, <strong className="text-gray-900">we made a decision:</strong>
            </p>
            
            <blockquote className="border-l-4 border-student-orange pl-6 py-4 bg-white/50 rounded-r-2xl">
              <p className="text-xl md:text-2xl font-bold bg-gradient-to-r from-student-orange to-student-blue bg-clip-text text-transparent italic">
                "If no one's going to help students make smarter buying decisions, we will."
              </p>
            </blockquote>
            
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed mt-6">
              That's how <strong className="text-student-blue">StudentStore</strong> was born – <strong>by students, for students.</strong>
            </p>
          </div>
        </section>

        {/* What Makes Us Different */}
        <section className="mb-12 md:mb-16">
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-gray-200">
            <h2 className="text-3xl md:text-4xl font-black mb-6 bg-gradient-to-r from-student-green to-student-blue bg-clip-text text-transparent">
              What Makes Us Different
            </h2>
            
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed mb-8">
              We're not just another shopping app. <strong className="text-gray-900">We're your insider connection to student wisdom.</strong>
            </p>

            {/* Product Store */}
            <div className="mb-8 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200">
              <h3 className="text-2xl md:text-3xl font-bold text-student-blue mb-4 flex items-center">
                🛍️ Product Store
              </h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="text-student-blue font-bold mr-2">✓</span>
                  <span><strong>Real student reviews</strong> - Not from random people, but from students who actually use these products in college</span>
                </li>
                <li className="flex items-start">
                  <span className="text-student-blue font-bold mr-2">✓</span>
                  <span><strong>Tested by students</strong> - Every recommended product has been used by students in real campus scenarios</span>
                </li>
                <li className="flex items-start">
                  <span className="text-student-blue font-bold mr-2">✓</span>
                  <span><strong>Honest recommendations</strong> - We won't recommend something just because it's popular</span>
                </li>
                <li className="flex items-start">
                  <span className="text-student-blue font-bold mr-2">✓</span>
                  <span><strong>Budget-friendly</strong> - We understand student budgets. Every product is evaluated for value</span>
                </li>
              </ul>
            </div>

            {/* Skill Store */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-6 border border-orange-200">
              <h3 className="text-2xl md:text-3xl font-bold text-student-orange mb-4 flex items-center">
                💼 Skill Store
              </h3>
              <p className="text-gray-700 mb-4 font-semibold">Because your career matters as much as your purchases.</p>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="text-student-orange font-bold mr-2">✓</span>
                  <span><strong>Skill development cards</strong> - Simple, student-friendly guides on skills that matter for your career</span>
                </li>
                <li className="flex items-start">
                  <span className="text-student-orange font-bold mr-2">✓</span>
                  <span><strong>Course recommendations</strong> - Both free and paid courses, with honest pros and cons</span>
                </li>
                <li className="flex items-start">
                  <span className="text-student-orange font-bold mr-2">✓</span>
                  <span><strong>Career guidance</strong> - Everything you need to know, explained in language students understand</span>
                </li>
                <li className="flex items-start">
                  <span className="text-student-orange font-bold mr-2">✓</span>
                  <span><strong>Research-backed</strong> - We research, test, and verify everything before sharing</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* How We Work */}
        <section className="mb-12 md:mb-16">
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-gray-200">
            <h2 className="text-3xl md:text-4xl font-black mb-6 text-gray-900">
              How We Work
            </h2>
            
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed mb-6">
              We're a team of students who:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 border border-blue-200">
                <p className="font-bold text-student-blue mb-2">✅ Research relentlessly</p>
                <p className="text-gray-700 text-sm">Hours of research go into every product and skill recommendation</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-5 border border-green-200">
                <p className="font-bold text-student-green mb-2">✅ Connect with students</p>
                <p className="text-gray-700 text-sm">We reach out to students across different colleges and cities</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-5 border border-orange-200">
                <p className="font-bold text-student-orange mb-2">✅ Test recommendations</p>
                <p className="text-gray-700 text-sm">We verify everything works for student life before suggesting</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-5 border border-purple-200">
                <p className="font-bold text-purple-600 mb-2">✅ Listen to YOU</p>
                <p className="text-gray-700 text-sm">Through our Assistant, you can suggest products and request guidance</p>
              </div>
            </div>
            
            <p className="text-lg text-gray-700 leading-relaxed mt-6">
              <strong className="text-gray-900">Your voice matters.</strong> When you write to us through the Assistant feature, we listen. Your suggestions help juniors make better decisions. Your reviews save another student from wasting money.
            </p>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="mb-12 md:mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mission */}
            <div className="bg-gradient-to-br from-student-blue to-student-green rounded-3xl shadow-xl p-6 md:p-8 text-white">
              <h2 className="text-2xl md:text-3xl font-black mb-4">Our Mission</h2>
              <p className="text-lg leading-relaxed">
                To make every student's shopping decision <strong>smarter, faster, and more confident.</strong>
              </p>
              <p className="mt-4 text-white/90">
                No more guessing. No more regrets. No more wasted money on products that don't work for student life.
              </p>
            </div>

            {/* Vision */}
            <div className="bg-gradient-to-br from-student-orange to-red-500 rounded-3xl shadow-xl p-6 md:p-8 text-white">
              <h2 className="text-2xl md:text-3xl font-black mb-4">Our Vision</h2>
              <p className="text-lg leading-relaxed">
                To become <strong>the most trusted student community</strong> where seniors guide juniors through honest reviews and career development is accessible to all.
              </p>
            </div>
          </div>
        </section>

        {/* Why Trust Us */}
        <section className="mb-12 md:mb-16">
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-gray-200">
            <h2 className="text-3xl md:text-4xl font-black mb-6 text-gray-900">
              Why Trust Us?
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-start">
                <span className="text-3xl mr-4">❤️</span>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">We're students</h3>
                  <p className="text-gray-700">We face the same challenges you do</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-3xl mr-4">🎯</span>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">We're honest</h3>
                  <p className="text-gray-700">We recommend only what we'd buy ourselves</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-3xl mr-4">🔍</span>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">We're thorough</h3>
                  <p className="text-gray-700">Every recommendation is researched and verified</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-3xl mr-4">🤝</span>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">We're community-driven</h3>
                  <p className="text-gray-700">Your feedback shapes what we recommend</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Join the Movement */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-student-blue/20 to-student-green/20 rounded-3xl shadow-lg p-6 md:p-10 border border-student-blue/30">
            <h2 className="text-3xl md:text-4xl font-black mb-6 text-gray-900 text-center">
              Join the Movement
            </h2>
            
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed text-center mb-6">
              <strong className="text-gray-900">StudentStore isn't just an app – it's a student-powered revolution.</strong>
            </p>
            
            <div className="bg-white rounded-2xl p-6 mb-6">
              <p className="text-gray-700 mb-4 font-semibold">Every time you:</p>
              <ul className="space-y-2 text-gray-700">
                <li>✅ <strong>Add a review</strong> → You help another student avoid a bad purchase</li>
                <li>✅ <strong>Suggest a product</strong> → You guide someone to make a smarter choice</li>
                <li>✅ <strong>Share your experience</strong> → You become the mentor you wish you had</li>
              </ul>
            </div>
            
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed text-center font-semibold">
              Together, we're building something bigger than an app. <span className="bg-gradient-to-r from-student-orange to-student-blue bg-clip-text text-transparent">We're building a community where students help students.</span>
            </p>
          </div>
        </section>

        {/* Contact */}
        <section>
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-gray-200 text-center">
            <h2 className="text-3xl md:text-4xl font-black mb-6 text-gray-900">
              Let's Connect
            </h2>
            
            <p className="text-lg text-gray-700 mb-6">
              Got questions? Suggestions? Want to share your story?
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a 
                href="mailto:studentstoreforstudents@gmail.com"
                className="flex items-center justify-center bg-gradient-to-r from-student-green to-student-blue text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Email Us
              </a>
              <a 
                href="https://instagram.com/studentstore.official"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center bg-gradient-to-r from-student-orange to-red-500 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                Instagram
              </a>
            </div>
            
            <p className="text-gray-600 mt-6">
              Or use our <strong>in-app Assistant</strong> – we read every message.
            </p>
          </div>
        </section>

        {/* Back to Home */}
        <div className="text-center mt-12">
          <Link 
            href="/"
            className="inline-flex items-center text-student-blue hover:text-student-green font-semibold text-lg transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
