export default function Footer() {
  // Simulate realistic student engagement metrics
  const studentStats = {
    totalStudents: '25,847',
    reviewsWritten: '156,392',
    universitiesReached: '847',
    moneySaved: '₹2.4M',
    averageRating: '4.8'
  };

  return (
    <footer className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white mt-20 relative overflow-hidden">
      {/* Subtle background pattern - MUCH MORE SUBTLE */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M30 30c0-16.569 13.431-30 30-30v60c-16.569 0-30-13.431-30-30z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16 relative z-10">
        {/* TRUST HUB - Student Success Stats */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white drop-shadow-lg">
            <span className="bg-gradient-to-r from-student-blue to-student-green bg-clip-text text-transparent">
              Trusted by Students
            </span>{" "}
            <span className="text-white">Everywhere</span>
          </h2>
          <p className="text-xl text-gray-200 mb-8 max-w-3xl mx-auto font-medium">
            Join thousands of students who've made StudentStore their go-to shopping companion
          </p>
          
          {/* Impact Statistics - BETTER CONTRAST */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-12">
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-xl">
              <div className="text-3xl font-bold text-student-blue mb-2 drop-shadow-sm">{studentStats.totalStudents}+</div>
              <div className="text-sm text-gray-200 font-medium">Happy Students</div>
            </div>
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-xl">
              <div className="text-3xl font-bold text-student-green mb-2 drop-shadow-sm">{studentStats.reviewsWritten}+</div>
              <div className="text-sm text-gray-200 font-medium">Helpful Reviews</div>
            </div>
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-xl">
              <div className="text-3xl font-bold text-student-orange mb-2 drop-shadow-sm">{studentStats.universitiesReached}+</div>
              <div className="text-sm text-gray-200 font-medium">Universities</div>
            </div>
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-xl">
              <div className="text-3xl font-bold text-student-green mb-2 drop-shadow-sm">{studentStats.moneySaved}</div>
              <div className="text-sm text-gray-200 font-medium">Money Saved</div>
            </div>
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-xl">
              <div className="text-3xl font-bold text-warning mb-2 drop-shadow-sm">{studentStats.averageRating}/5</div>
              <div className="text-sm text-gray-200 font-medium">Average Rating</div>
            </div>
          </div>
        </div>

        {/* Student Success Stories - BETTER CONTRAST */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-center mb-8 text-white drop-shadow-lg">
            <span className="text-student-green">What Students Say</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1 - IMPROVED READABILITY */}
            <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-xl">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-student-blue to-student-green rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  A
                </div>
                <div className="ml-3">
                  <div className="font-semibold text-white">Aarav K.</div>
                  <div className="text-sm text-gray-300">Engineering Student, IIT Delhi</div>
                </div>
              </div>
              <p className="text-gray-200 text-sm leading-relaxed font-medium">
                "StudentStore saved me ₹15,000 on my laptop purchase! The reviews from other engineering students were spot-on. Now I check here before buying anything."
              </p>
              <div className="flex items-center mt-4">
                <div className="flex text-warning text-sm">★★★★★</div>
                <span className="ml-2 text-xs text-gray-400 bg-slate-700/50 px-2 py-1 rounded-full">Verified Purchase</span>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-xl">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-student-green to-student-orange rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  P
                </div>
                <div className="ml-3">
                  <div className="font-semibold text-white">Priya S.</div>
                  <div className="text-sm text-gray-300">Medical Student, AIIMS</div>
                </div>
              </div>
              <p className="text-gray-200 text-sm leading-relaxed font-medium">
                "The textbook recommendations here are incredible. Fellow med students' reviews helped me choose the right study materials. My grades improved significantly!"
              </p>
              <div className="flex items-center mt-4">
                <div className="flex text-warning text-sm">★★★★★</div>
                <span className="ml-2 text-xs text-gray-400 bg-slate-700/50 px-2 py-1 rounded-full">Verified Student</span>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-slate-800/90 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-xl">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-student-orange to-student-blue rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  R
                </div>
                <div className="ml-3">
                  <div className="font-semibold text-white">Rohit M.</div>
                  <div className="text-sm text-gray-300">MBA Student, ISB</div>
                </div>
              </div>
              <p className="text-gray-200 text-sm leading-relaxed font-medium">
                "This platform understands students' needs perfectly. Budget-friendly options, honest reviews, and products that actually matter for our academic journey."
              </p>
              <div className="flex items-center mt-4">
                <div className="flex text-warning text-sm">★★★★★</div>
                <span className="ml-2 text-xs text-gray-400 bg-slate-700/50 px-2 py-1 rounded-full">MBA Graduate</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Footer Content - IMPROVED CONTRAST */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Enhanced Brand Section */}
          <div className="lg:col-span-5">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-gradient-to-r from-student-blue to-student-green text-white px-4 py-2 rounded-xl font-bold text-2xl shadow-lg">
                🎓 StudentStore
              </div>
            </div>
            <p className="text-gray-200 text-lg leading-relaxed mb-6 font-medium">
              <strong className="text-white">By Students, For Students.</strong> We're a community of students who understand what you really need. 
              Every product is handpicked, every review is from a real student, every recommendation comes from experience.
            </p>
            
            {/* Enhanced Why StudentStore - BETTER BACKGROUND */}
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-slate-700 shadow-xl">
              <h3 className="font-bold text-lg mb-4 text-white flex items-center">
                <span className="text-2xl mr-2">🏆</span>
                Why Students Choose Us
              </h3>
              <ul className="space-y-3 text-gray-200">
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-student-green mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span><strong className="text-white">Real student reviews</strong> - No fake feedback, only honest experiences</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-student-green mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span><strong className="text-white">Budget-conscious curation</strong> - We understand your financial constraints</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-student-green mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span><strong className="text-white">Academic success focus</strong> - Products that actually help you excel</span>
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 text-student-green mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span><strong className="text-white">Community-driven</strong> - Students helping students succeed</span>
                </li>
              </ul>
            </div>

            {/* Enhanced Social Links - BETTER CONTRAST */}
            <div className="flex space-x-4">
              <a href="#" className="w-12 h-12 bg-slate-800/80 backdrop-blur-sm hover:bg-student-blue/80 rounded-full flex items-center justify-center transition-all duration-300 border border-slate-700 hover:border-student-blue hover:scale-110 shadow-lg">
                <span className="text-xl">📘</span>
              </a>
              <a href="#" className="w-12 h-12 bg-slate-800/80 backdrop-blur-sm hover:bg-student-green/80 rounded-full flex items-center justify-center transition-all duration-300 border border-slate-700 hover:border-student-green hover:scale-110 shadow-lg">
                <span className="text-xl">🐦</span>
              </a>
              <a href="#" className="w-12 h-12 bg-slate-800/80 backdrop-blur-sm hover:bg-student-orange/80 rounded-full flex items-center justify-center transition-all duration-300 border border-slate-700 hover:border-student-orange hover:scale-110 shadow-lg">
                <span className="text-xl">📷</span>
              </a>
              <a href="#" className="w-12 h-12 bg-slate-800/80 backdrop-blur-sm hover:bg-purple-500/80 rounded-full flex items-center justify-center transition-all duration-300 border border-slate-700 hover:border-purple-500 hover:scale-110 shadow-lg">
                <span className="text-xl">💼</span>
              </a>
            </div>
          </div>

          {/* Enhanced Navigation Links - BETTER READABILITY */}
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Student Resources */}
            <div>
              <h3 className="text-lg font-bold mb-6 text-white flex items-center drop-shadow-sm">
                <span className="text-xl mr-2">🎓</span>
                Student Resources
              </h3>
              <ul className="space-y-3">
                <li><a href="/textbooks" className="text-gray-300 hover:text-student-green transition-colors duration-200 flex items-center group font-medium">📚 <span className="ml-2 group-hover:translate-x-1 transition-transform duration-200">Textbooks & Study Materials</span></a></li>
                <li><a href="/electronics" className="text-gray-300 hover:text-student-green transition-colors duration-200 flex items-center group font-medium">💻 <span className="ml-2 group-hover:translate-x-1 transition-transform duration-200">Electronics & Tech</span></a></li>
                <li><a href="/stationery" className="text-gray-300 hover:text-student-green transition-colors duration-200 flex items-center group font-medium">✏️ <span className="ml-2 group-hover:translate-x-1 transition-transform duration-200">Stationery & Supplies</span></a></li>
                <li><a href="/campus-gear" className="text-gray-300 hover:text-student-green transition-colors duration-200 flex items-center group font-medium">🎒 <span className="ml-2 group-hover:translate-x-1 transition-transform duration-200">Campus Essentials</span></a></li>
                <li><a href="/courses" className="text-gray-300 hover:text-student-green transition-colors duration-200 flex items-center group font-medium">📖 <span className="ml-2 group-hover:translate-x-1 transition-transform duration-200">Online Courses</span></a></li>
              </ul>
            </div>

            {/* Community & Support */}
            <div>
              <h3 className="text-lg font-bold mb-6 text-white flex items-center drop-shadow-sm">
                <span className="text-xl mr-2">🤝</span>
                Community & Support
              </h3>
              <ul className="space-y-3">
                <li><a href="/how-it-works" className="text-gray-300 hover:text-student-green transition-all duration-200 hover:translate-x-1 inline-block font-medium">How StudentStore Works</a></li>
                <li><a href="/student-guide" className="text-gray-300 hover:text-student-green transition-all duration-200 hover:translate-x-1 inline-block font-medium">Smart Shopping Guide</a></li>
                <li><a href="/reviews" className="text-gray-300 hover:text-student-green transition-all duration-200 hover:translate-x-1 inline-block font-medium">Student Reviews Hub</a></li>
                <li><a href="/deals" className="text-gray-300 hover:text-student-green transition-all duration-200 hover:translate-x-1 inline-block font-medium">Exclusive Student Deals</a></li>
                <li><a href="/contact" className="text-gray-300 hover:text-student-green transition-all duration-200 hover:translate-x-1 inline-block font-medium">Get Help & Support</a></li>
              </ul>
            </div>

            {/* About & Trust */}
            <div>
              <h3 className="text-lg font-bold mb-6 text-white flex items-center drop-shadow-sm">
                <span className="text-xl mr-2">🏛️</span>
                About & Trust
              </h3>
              <ul className="space-y-3">
                <li><a href="/about" className="text-gray-300 hover:text-student-green transition-all duration-200 hover:translate-x-1 inline-block font-medium">Our Student Story</a></li>
                <li><a href="/mission" className="text-gray-300 hover:text-student-green transition-all duration-200 hover:translate-x-1 inline-block font-medium">Mission & Values</a></li>
                <li><a href="/privacy" className="text-gray-300 hover:text-student-green transition-all duration-200 hover:translate-x-1 inline-block font-medium">Privacy Policy</a></li>
                <li><a href="/terms" className="text-gray-300 hover:text-student-green transition-all duration-200 hover:translate-x-1 inline-block font-medium">Terms of Service</a></li>
                <li><a href="/affiliate" className="text-gray-300 hover:text-student-green transition-all duration-200 hover:translate-x-1 inline-block font-medium">Partner Program</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Enhanced Bottom Bar - PERFECT VISIBILITY */}
        <div className="border-t border-slate-700 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-300 mb-4 md:mb-0 text-center md:text-left">
              <p className="flex items-center justify-center md:justify-start font-medium">
                <span className="mr-2">©</span> 2025 StudentStore. Made with 
                <span className="mx-2 text-red-400">❤️</span> by students, for students everywhere.
              </p>
            </div>
            <div className="flex items-center space-x-6 text-sm">
              {/* <span className="text-white bg-student-green/20 px-3 py-1 rounded-full border border-student-green/30 flex items-center font-medium">
                <span className="mr-1">🔒</span> Secure Shopping
              </span>
              <span className="text-white bg-student-blue/20 px-3 py-1 rounded-full border border-student-blue/30 flex items-center font-medium">
                <span className="mr-1">⚡</span> Fast Delivery
              </span>
              <span className="text-white bg-student-orange/20 px-3 py-1 rounded-full border border-student-orange/30 flex items-center font-medium">
                <span className="mr-1">💯</span> Student Verified
              </span> */}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
