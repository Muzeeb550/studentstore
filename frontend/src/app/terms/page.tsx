import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service - StudentStore',
  description: 'Terms of Service for StudentStore. Simple rules for using our app.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-student-orange to-red-500 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4">
            Terms of Service
          </h1>
          <p className="text-xl md:text-2xl text-white/90 font-semibold">
            Simple rules for using StudentStore
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
            <h2 className="text-3xl md:text-4xl font-black mb-6 bg-gradient-to-r from-student-orange to-student-blue bg-clip-text text-transparent">
              Welcome to StudentStore!
            </h2>
            
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed mb-4">
              These are the rules for using our app. We've kept them simple and straightforward – no confusing legal jargon.
            </p>
            
            <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-5 border border-orange-200">
              <p className="text-gray-700">
                <strong className="text-gray-900">By using StudentStore, you agree to these Terms of Service.</strong> If you don't agree, please don't use the app.
              </p>
            </div>
          </div>
        </section>

        {/* What You Can Do */}
        <section className="mb-12">
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-gray-200">
            <h2 className="text-3xl md:text-4xl font-black mb-6 bg-gradient-to-r from-student-green to-student-blue bg-clip-text text-transparent">
              What You Can Do
            </h2>
            
            <div className="space-y-4 text-gray-700">
              <div className="flex items-start">
                <span className="text-2xl mr-3">✅</span>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Browse products and reviews</h3>
                  <p>Explore everything StudentStore has to offer</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-2xl mr-3">✅</span>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Add products to your wishlist</h3>
                  <p>Save your favorite products for later</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-2xl mr-3">✅</span>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Write honest reviews</h3>
                  <p>Share your real experiences to help other students</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-2xl mr-3">✅</span>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Share StudentStore with friends</h3>
                  <p>Help other students discover smarter shopping</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-2xl mr-3">✅</span>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Use our Assistant</h3>
                  <p>Suggest products or ask for recommendations</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What You CAN'T Do */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-3xl shadow-xl p-6 md:p-10 border border-red-200">
            <h2 className="text-3xl md:text-4xl font-black mb-6 text-gray-900">
              What You <span className="text-red-600">CAN'T</span> Do
            </h2>
            
            <div className="space-y-4 text-gray-700">
              <div className="flex items-start">
                <span className="text-2xl mr-3">❌</span>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Create fake accounts</h3>
                  <p>One account per student. Keep it real.</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-2xl mr-3">❌</span>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Write fake reviews</h3>
                  <p>Only review products you've actually used</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-2xl mr-3">❌</span>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Spam or abuse other students</h3>
                  <p>Be respectful. We're all in this together.</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-2xl mr-3">❌</span>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Use the app for anything illegal</h3>
                  <p>Follow the law. This should be obvious.</p>
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-2xl mr-3">❌</span>
                <div>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Copy or steal our content</h3>
                  <p>Product descriptions, reviews, and designs belong to StudentStore</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Age Requirement */}
        <section className="mb-12">
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-gray-200">
            <h2 className="text-3xl md:text-4xl font-black mb-6 text-gray-900">
              🎓 Age Requirement
            </h2>
            
            <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                You must be <strong className="text-student-blue">13 years or older</strong> to use StudentStore.
              </p>
              <p className="text-gray-600 mt-3">
                If you're under 13, please ask your parent or guardian before using the app.
              </p>
            </div>
          </div>
        </section>

        {/* Affiliate Links - IMPORTANT */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-3xl shadow-xl p-6 md:p-10 border border-yellow-300">
            <h2 className="text-3xl md:text-4xl font-black mb-6 text-gray-900">
              💰 Affiliate Links (Important!)
            </h2>
            
            <div className="bg-white rounded-2xl p-6 border border-yellow-200 mb-4">
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed mb-4">
                <strong className="text-gray-900">Transparency first:</strong> We may earn a small commission when you buy products through our links (Amazon, Flipkart, etc.).
              </p>
              
              <div className="space-y-3 text-gray-700">
                <div className="flex items-start">
                  <span className="text-student-orange font-bold mr-2">•</span>
                  <span><strong>Your price stays the same</strong> – You pay exactly what you'd pay if you went directly to Amazon/Flipkart</span>
                </div>
                <div className="flex items-start">
                  <span className="text-student-orange font-bold mr-2">•</span>
                  <span><strong>This helps keep StudentStore free</strong> – We don't charge students to use the app</span>
                </div>
                <div className="flex items-start">
                  <span className="text-student-orange font-bold mr-2">•</span>
                  <span><strong>We still recommend honestly</strong> – We only suggest products that actually help students</span>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 italic">
              This disclosure complies with FTC guidelines (US) and Consumer Protection Act (India).
            </p>
          </div>
        </section>

        {/* Product Liability */}
        <section className="mb-12">
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-gray-200">
            <h2 className="text-3xl md:text-4xl font-black mb-6 bg-gradient-to-r from-student-blue to-student-green bg-clip-text text-transparent">
              📦 Product Liability
            </h2>
            
            <p className="text-lg text-gray-700 mb-4">
              Here's what you need to know about products:
            </p>

            <div className="space-y-4 text-gray-700">
              <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                <p className="font-bold text-student-blue mb-2">We recommend products, but we don't sell them</p>
                <p className="text-sm">StudentStore connects you to Amazon, Flipkart, and other sellers. We're not the merchant.</p>
              </div>
              <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                <p className="font-bold text-student-green mb-2">If a product is bad, contact the seller</p>
                <p className="text-sm">Issues with delivery, quality, or returns? Reach out to Amazon/Flipkart/the seller directly.</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-5 border border-orange-200">
                <p className="font-bold text-student-orange mb-2">We're not responsible for product quality</p>
                <p className="text-sm">We curate based on student reviews, but we can't guarantee every product will work for you.</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-5 border border-purple-200">
                <p className="font-bold text-purple-600 mb-2">Always check product details before buying</p>
                <p className="text-sm">Read the full description, specs, and reviews on the seller's website.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Account Termination */}
        <section className="mb-12">
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-gray-200">
            <h2 className="text-3xl md:text-4xl font-black mb-6 text-gray-900">
              🚫 Account Termination
            </h2>
            
            <p className="text-lg text-gray-700 mb-4">
              We can suspend or delete your account if you:
            </p>

            <div className="space-y-3 text-gray-700">
              <div className="flex items-start">
                <span className="text-red-600 font-bold mr-2">•</span>
                <span>Break these Terms of Service</span>
              </div>
              <div className="flex items-start">
                <span className="text-red-600 font-bold mr-2">•</span>
                <span>Write fake reviews or spam the platform</span>
              </div>
              <div className="flex items-start">
                <span className="text-red-600 font-bold mr-2">•</span>
                <span>Abuse other students or our team</span>
              </div>
              <div className="flex items-start">
                <span className="text-red-600 font-bold mr-2">•</span>
                <span>Use StudentStore for illegal activities</span>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-xl p-5 border border-yellow-200 mt-6">
              <p className="text-gray-700">
                <strong className="text-gray-900">Fair warning:</strong> We'll usually give you a warning first, but serious violations may result in immediate account suspension.
              </p>
            </div>
          </div>
        </section>

        {/* Content Ownership */}
        <section className="mb-12">
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-gray-200">
            <h2 className="text-3xl md:text-4xl font-black mb-6 bg-gradient-to-r from-student-orange to-student-blue bg-clip-text text-transparent">
              📝 Content Ownership
            </h2>
            
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                <p className="font-bold text-student-blue mb-2">Your Reviews</p>
                <p className="text-gray-700 text-sm">When you write a review, you still own it. But you give us permission to display it on StudentStore and use it in marketing materials (to help other students).</p>
              </div>
              <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                <p className="font-bold text-student-green mb-2">Our Content</p>
                <p className="text-gray-700 text-sm">Product descriptions, app design, logo, and curated content belong to StudentStore. Don't copy them without permission.</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-5 border border-orange-200">
                <p className="font-bold text-student-orange mb-2">Uploaded Images</p>
                <p className="text-gray-700 text-sm">Your profile picture from Google login is yours. We only use it to display your account.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Changes to Terms */}
        <section className="mb-12">
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-gray-200">
            <h2 className="text-3xl md:text-4xl font-black mb-6 text-gray-900">
              🔄 Changes to Terms
            </h2>
            
            <p className="text-lg text-gray-700 mb-4">
              We may update these Terms of Service from time to time.
            </p>

            <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
              <p className="text-gray-700">
                <strong className="text-gray-900">What happens:</strong> If we make major changes, we'll notify you via email or an in-app notification. By continuing to use StudentStore after changes, you agree to the new Terms.
              </p>
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-3xl shadow-xl p-6 md:p-10 border border-gray-300">
            <h2 className="text-3xl md:text-4xl font-black mb-6 text-gray-900">
              ⚠️ Disclaimer
            </h2>
            
            <p className="text-lg text-gray-700 leading-relaxed mb-4">
              StudentStore is provided <strong>"as is"</strong> without warranties of any kind.
            </p>

            <p className="text-gray-700">
              We work hard to make StudentStore helpful and accurate, but we can't guarantee that every product recommendation will be perfect for you. Use your best judgment when making purchases.
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="mb-12">
          <div className="bg-white rounded-3xl shadow-xl p-6 md:p-10 border border-gray-200 text-center">
            <h2 className="text-3xl md:text-4xl font-black mb-6 text-gray-900">
              Questions?
            </h2>
            
            <p className="text-lg text-gray-700 mb-6">
              If you have any questions about these Terms of Service, email us at:
            </p>
            
            <a 
              href="mailto:support@studentstore.app"
              className="inline-flex items-center justify-center bg-gradient-to-r from-student-orange to-red-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-lg transition-all"
            >
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              support@studentstore.app
            </a>
          </div>
        </section>

        {/* Agreement */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-student-orange/20 to-student-blue/20 rounded-3xl shadow-lg p-6 md:p-10 border border-student-orange/30 text-center">
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed font-semibold">
              By using StudentStore, you agree to these Terms of Service.
            </p>
          </div>
        </section>

        {/* Back Links */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            href="/"
            className="inline-flex items-center text-student-orange hover:text-student-blue font-semibold text-lg transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
          <span className="text-gray-400">•</span>
          <Link 
            href="/privacy"
            className="text-student-orange hover:text-student-blue font-semibold text-lg transition-colors"
          >
            Read Privacy Policy →
          </Link>
        </div>
      </div>
    </div>
  );
}
