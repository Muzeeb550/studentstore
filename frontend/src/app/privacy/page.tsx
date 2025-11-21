import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy - StudentStore',
  description: 'Learn how StudentStore protects your data and privacy. Simple, transparent, student-friendly.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-student-blue to-student-green py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-xl md:text-2xl text-white/90 font-semibold">
            Your privacy matters. Here's how we protect it.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        
        {/* Last Updated */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-r-xl p-4 mb-8">
          <p className="text-sm md:text-base text-gray-700">
            <strong className="text-gray-900">Last Updated:</strong> November 7, 2025
          </p>
        </div>

        {/* Introduction */}
        <section className="mb-12">
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-gray-200">
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed mb-4">
              Welcome to <strong className="text-student-blue">StudentStore</strong>! We're students just like you, and we take your privacy seriously. This Privacy Policy explains what data we collect, how we use it, and your rights.
            </p>
            <p className="text-base md:text-lg text-gray-600">
              We've written this in plain English – no confusing. If you have questions, email us at <a href="mailto:studentstoreforstudents@gmail.com" className="text-student-blue hover:underline font-semibold">studentstoreforstudents@gmail.com</a>
            </p>
          </div>
        </section>

        {/* What We Collect */}
        <section className="mb-12">
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-gray-200">
            <h2 className="text-3xl md:text-4xl font-black mb-6 bg-gradient-to-r from-student-blue to-student-green bg-clip-text text-transparent">
              What We Collect
            </h2>
            
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-2xl p-5 border border-blue-200">
                <h3 className="text-xl font-bold text-student-blue mb-3 flex items-center">
                  <span className="mr-2">👤</span> Account Information
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-student-blue font-bold mr-2">•</span>
                    <span>Your name, email, and profile picture (from Google login)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-student-blue font-bold mr-2">•</span>
                    <span>Login date and time</span>
                  </li>
                </ul>
              </div>

              <div className="bg-green-50 rounded-2xl p-5 border border-green-200">
                <h3 className="text-xl font-bold text-student-green mb-3 flex items-center">
                  <span className="mr-2">💚</span> Your Activity
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-student-green font-bold mr-2">•</span>
                    <span>Products you add to your wishlist</span>
                  </li>
                  {/* <li className="flex items-start">
                    <span className="text-student-green font-bold mr-2">•</span>
                    <span>Products you recently viewed</span>
                  </li> */}
                  <li className="flex items-start">
                    <span className="text-student-green font-bold mr-2">•</span>
                    <span>Reviews you write (if you choose to write any)</span>
                  </li>
                </ul>
              </div>

              <div className="bg-orange-50 rounded-2xl p-5 border border-orange-200">
                <h3 className="text-xl font-bold text-student-orange mb-3 flex items-center">
                  <span className="mr-2">📱</span> Technical Data
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-student-orange font-bold mr-2">•</span>
                    <span>Device type (phone, tablet, laptop)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-student-orange font-bold mr-2">•</span>
                    <span>Browser type (Chrome, Safari, etc.)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-student-orange font-bold mr-2">•</span>
                    <span>IP address (for security)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Why We Collect It */}
        <section className="mb-12">
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-gray-200">
            <h2 className="text-3xl md:text-4xl font-black mb-6 bg-gradient-to-r from-student-green to-student-blue bg-clip-text text-transparent">
              Why We Collect It
            </h2>
            
            <div className="space-y-4 text-gray-700">
              <div className="flex items-start">
                <span className="text-2xl mr-3">✅</span>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">To keep you logged in</h3>
                  <p>So you don't have to sign in every time you visit</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-2xl mr-3">✅</span>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">To show personalized recommendations</h3>
                  <p>Based on what you've viewed and liked</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-2xl mr-3">✅</span>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">To save your wishlist</h3>
                  <p>So you can access it from any device</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-2xl mr-3">✅</span>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">To improve StudentStore</h3>
                  <p>By understanding what students find useful</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How We Store It */}
        <section className="mb-12">
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-gray-200">
            <h2 className="text-3xl md:text-4xl font-black mb-6 bg-gradient-to-r from-student-orange to-student-blue bg-clip-text text-transparent">
              How We Store & Protect Your Data
            </h2>
            
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-6 border border-blue-200 mb-6">
              <p className="text-lg text-gray-700 leading-relaxed">
                <strong className="text-gray-900">Your data is safe with us.</strong> We use industry-standard security measures:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                <p className="font-bold text-student-blue mb-2">🔒 HTTPS Encryption</p>
                <p className="text-gray-700 text-sm">All data is encrypted in transit</p>
              </div>
              <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                <p className="font-bold text-student-green mb-2">🗄️ Secure Database</p>
                <p className="text-gray-700 text-sm">PostgreSQL with encryption at rest</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-5 border border-orange-200">
                <p className="font-bold text-student-orange mb-2">☁️ Cloud Storage</p>
                <p className="text-gray-700 text-sm">Images stored on ImageKit.io</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-5 border border-purple-200">
                <p className="font-bold text-purple-600 mb-2">🔐 OAuth 2.0</p>
                <p className="text-gray-700 text-sm">Google login for secure authentication</p>
              </div>
            </div>
          </div>
        </section>

        {/* What We DON'T Do */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-3xl shadow-xl p-6 md:p-10 border border-red-200">
            <h2 className="text-3xl md:text-4xl font-black mb-6 text-gray-900">
              What We <span className="text-red-600">DON'T</span> Do
            </h2>
            
            <div className="space-y-4 text-gray-700">
              <div className="flex items-start">
                <span className="text-2xl mr-3">❌</span>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Sell your data to anyone</h3>
                  <p>Never. Period.</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-2xl mr-3">❌</span>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Spam your email</h3>
                  <p>We won't send you emails unless it's important</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-2xl mr-3">❌</span>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Share your info with third parties</h3>
                  <p>Except Google OAuth for login (required)</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-2xl mr-3">❌</span>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Track you outside StudentStore</h3>
                  <p>We don't follow you around the internet</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Your Rights */}
        <section className="mb-12">
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-gray-200">
            <h2 className="text-3xl md:text-4xl font-black mb-6 bg-gradient-to-r from-student-blue to-student-green bg-clip-text text-transparent">
              Your Rights
            </h2>
            
            <p className="text-lg text-gray-700 mb-6">
              You're in control of your data. Here's what you can do:
            </p>

            <div className="space-y-4 text-gray-700">
              <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                <h3 className="font-bold text-lg text-student-blue mb-2">✅ Delete Your Account</h3>
                <p className="text-sm">You can delete your account anytime from Settings. All your data will be permanently removed.</p>
              </div>
              <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                <h3 className="font-bold text-lg text-student-green mb-2">✅ Request Your Data</h3>
                <p className="text-sm">Email us at <a href="mailto:studentstoreforstudents@gmail.com" className="underline">studentstoreforstudents@gmail.com</a> and we'll send you all your data within 7 days.</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-5 border border-orange-200">
                <h3 className="font-bold text-lg text-student-orange mb-2">✅ Stop Using the App</h3>
                <p className="text-sm">You can stop using StudentStore anytime. No hard feelings!</p>
              </div>
            </div>
          </div>
        </section>

        {/* Cookies */}
        <section className="mb-12">
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-gray-200">
            <h2 className="text-3xl md:text-4xl font-black mb-6 text-gray-900">
              🍪 Cookies
            </h2>
            
            <p className="text-lg text-gray-700 mb-4">
              We use cookies to keep you logged in. That's it!
            </p>
            
            <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
              <p className="text-gray-700">
                <strong className="text-gray-900">What's a cookie?</strong> A small piece of data stored in your browser that remembers your login session. Without it, you'd have to sign in every time you visit StudentStore.
              </p>
            </div>
          </div>
        </section>

        {/* GDPR Compliance */}
        {/* <section className="mb-12">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-3xl shadow-xl p-6 md:p-10 border border-blue-200">
            <h2 className="text-3xl md:text-4xl font-black mb-6 text-gray-900">
              🇪🇺 GDPR Compliance
            </h2>
            
            <p className="text-lg text-gray-700 mb-4">
              If you're in the European Union, you have additional rights under GDPR:
            </p>
            
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-student-blue font-bold mr-2">✓</span>
                <span>Right to access your data</span>
              </li>
              <li className="flex items-start">
                <span className="text-student-blue font-bold mr-2">✓</span>
                <span>Right to correct your data</span>
              </li>
              <li className="flex items-start">
                <span className="text-student-blue font-bold mr-2">✓</span>
                <span>Right to delete your data ("right to be forgotten")</span>
              </li>
              <li className="flex items-start">
                <span className="text-student-blue font-bold mr-2">✓</span>
                <span>Right to export your data</span>
              </li>
            </ul>
            
            <p className="text-gray-700 mt-4">
              To exercise any of these rights, email <a href="mailto:studentstoreforstudents@gmail.com" className="text-student-blue hover:underline font-semibold">studentstoreforstudents@gmail.com</a>
            </p>
          </div>
        </section> */}

        {/* Contact */}
        <section className="mb-12">
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-gray-200 text-center">
            <h2 className="text-3xl md:text-4xl font-black mb-6 text-gray-900">
              Questions?
            </h2>
            
            <p className="text-lg text-gray-700 mb-6">
              If you have any questions about this Privacy Policy, email us at:
            </p>
            
            <a 
              href="mailto:studentstoreforstudents@gmail.com"
              className="inline-flex items-center justify-center bg-gradient-to-r from-student-blue to-student-green text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-lg transition-all"
            >
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              studentstoreforstudents@gmail.com
            </a>
          </div>
        </section>

        {/* Agreement */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-student-orange/20 to-student-blue/20 rounded-3xl shadow-lg p-6 md:p-10 border border-student-orange/30 text-center">
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed font-semibold">
              By using StudentStore, you agree to this Privacy Policy.
            </p>
          </div>
        </section>

        {/* Back Links */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/"
            className="inline-flex items-center text-student-blue hover:text-student-green font-semibold text-lg transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
          <span className="text-gray-400">•</span>
          <Link 
            href="/terms"
            className="text-student-blue hover:text-student-green font-semibold text-lg transition-colors"
          >
            Read Terms of Service →
          </Link>
        </div>
      </div>
    </div>
  );
}
