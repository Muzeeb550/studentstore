export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white mt-20">
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-5">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-xl font-bold text-2xl">
                🎓 StudentStore
              </div>
            </div>
            <p className="text-gray-300 text-lg leading-relaxed mb-6">
              Your ultimate destination for everything students need. From textbooks to tech gadgets, 
              we curate the best products at student-friendly prices. Built by students, for students.
            </p>
            
            {/* Why StudentStore */}
            <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 rounded-2xl p-6 mb-6">
              <h3 className="font-bold text-lg mb-4 text-indigo-300">Why Choose StudentStore?</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Student-verified deals and products
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Real reviews from fellow students
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Budget-friendly pricing
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-green-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Curated for academic success
                </li>
              </ul>
            </div>

            {/* Social Links */}
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 bg-gray-700 hover:bg-indigo-600 rounded-full flex items-center justify-center transition-colors duration-200">
                <span className="text-xl">📘</span>
              </a>
              <a href="#" className="w-10 h-10 bg-gray-700 hover:bg-blue-500 rounded-full flex items-center justify-center transition-colors duration-200">
                <span className="text-xl">🐦</span>
              </a>
              <a href="#" className="w-10 h-10 bg-gray-700 hover:bg-pink-500 rounded-full flex items-center justify-center transition-colors duration-200">
                <span className="text-xl">📷</span>
              </a>
              <a href="#" className="w-10 h-10 bg-gray-700 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors duration-200">
                <span className="text-xl">💼</span>
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Student Resources */}
            <div>
              <h3 className="text-lg font-bold mb-6 text-indigo-300">Student Resources</h3>
              <ul className="space-y-3">
                <li><a href="/textbooks" className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center">📚 Textbooks & Books</a></li>
                <li><a href="/electronics" className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center">💻 Electronics & Tech</a></li>
                <li><a href="/stationery" className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center">✏️ Stationery & Supplies</a></li>
                <li><a href="/campus-gear" className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center">🎒 Campus Essentials</a></li>
                <li><a href="/courses" className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center">📖 Online Courses</a></li>
              </ul>
            </div>

            {/* Support & Help */}
            <div>
              <h3 className="text-lg font-bold mb-6 text-indigo-300">Support & Help</h3>
              <ul className="space-y-3">
                <li><a href="/how-it-works" className="text-gray-300 hover:text-white transition-colors duration-200">How It Works</a></li>
                <li><a href="/student-guide" className="text-gray-300 hover:text-white transition-colors duration-200">Student Shopping Guide</a></li>
                <li><a href="/deals" className="text-gray-300 hover:text-white transition-colors duration-200">Latest Deals</a></li>
                <li><a href="/reviews" className="text-gray-300 hover:text-white transition-colors duration-200">Product Reviews</a></li>
                <li><a href="/contact" className="text-gray-300 hover:text-white transition-colors duration-200">Contact Support</a></li>
              </ul>
            </div>

            {/* About & Legal */}
            <div>
              <h3 className="text-lg font-bold mb-6 text-indigo-300">About & Legal</h3>
              <ul className="space-y-3">
                <li><a href="/about" className="text-gray-300 hover:text-white transition-colors duration-200">About StudentStore</a></li>
                <li><a href="/mission" className="text-gray-300 hover:text-white transition-colors duration-200">Our Mission</a></li>
                <li><a href="/privacy" className="text-gray-300 hover:text-white transition-colors duration-200">Privacy Policy</a></li>
                <li><a href="/terms" className="text-gray-300 hover:text-white transition-colors duration-200">Terms of Service</a></li>
                <li><a href="/affiliate" className="text-gray-300 hover:text-white transition-colors duration-200">Affiliate Program</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 mb-4 md:mb-0">
              <p>&copy; 2025 StudentStore. All rights reserved. Made with ❤️ for students everywhere.</p>
            </div>
            <div className="flex items-center space-x-6 text-sm text-gray-400">
              <span>🔒 Secure Shopping</span>
              <span>⚡ Fast Delivery</span>
              <span>💯 Student Approved</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
