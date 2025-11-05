'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Resource {
  id: number;
  resource_number: number;
  image_url: string;
  link_url: string;
}

interface SkillData {
  skill: {
    id: number;
    name: string;
  };
  free_resources: Resource[];
  paid_resources: Resource[];
}

export default function SkillResourcesPage() {
  const params = useParams();
  const skillId = parseInt(params.skillId as string);

  const [data, setData] = useState<SkillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'free' | 'paid'>('free');

  // ✅ NEW: Track if we've already fetched
  const hasFetchedRef = useRef(false);
  const previousSkillIdRef = useRef<number | null>(null);

  useEffect(() => {
    // ✅ FIXED: Reset fetch flag when skillId changes
    if (skillId !== previousSkillIdRef.current) {
      hasFetchedRef.current = false;
      previousSkillIdRef.current = skillId;
    }

    fetchSkillResources();
  }, [skillId]); // ✅ FIXED: Added skillId dependency

  const fetchSkillResources = async () => {
    try {
      // ✅ Only fetch if we haven't fetched this skill yet
      if (hasFetchedRef.current) {
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      // ✅ SIMPLIFIED: Remove complex headers, just use query param
      const response = await fetch(
        `${apiUrl}/api/skillstore/skills/${skillId}?t=${Date.now()}`,
        {
          method: 'GET',
          credentials: 'omit' // ✅ Don't send cookies
        }
      );

      console.log('✅ Resources Response Status:', response.status);

      if (!response.ok) {
        console.error('❌ Fetch failed:', response.statusText);
        setError('Failed to load resources');
        return;
      }

      const result = await response.json();

      console.log('📊 Resources Data:', result);

      if (result.status === 'success') {
        setData(result.data);
        setError('');
        hasFetchedRef.current = true; // ✅ Mark as fetched
      } else {
        setError(result.message || 'Skill not found');
      }
    } catch (error) {
      console.error('❌ Fetch error:', error);
      setError('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href={`/skillstore/${skillId}`} className="text-purple-600 hover:text-purple-700">
            ← Back to Skill
          </Link>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800 font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  const resources = activeTab === 'free' ? data.free_resources : data.paid_resources;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Header */}
      <div className="mb-8">
        <Link href={`/skillstore/${skillId}`} className="text-purple-600 hover:text-purple-700 mb-4 inline-block">
          ← Back to {data.skill.name}
        </Link>
        
        <h1 className="text-4xl font-bold text-gray-900">{data.skill.name}</h1>
        <p className="text-gray-600 mt-2">Learning Resources & Courses</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-8 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('free')}
          className={`px-6 py-4 font-semibold transition-colors border-b-2 ${
            activeTab === 'free'
              ? 'text-purple-600 border-purple-600'
              : 'text-gray-600 border-transparent hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>🎓 Free Resources</span>
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
              {data.free_resources.length}
            </span>
          </div>
        </button>
        
        <button
          onClick={() => setActiveTab('paid')}
          className={`px-6 py-4 font-semibold transition-colors border-b-2 ${
            activeTab === 'paid'
              ? 'text-purple-600 border-purple-600'
              : 'text-gray-600 border-transparent hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>💰 Paid Courses</span>
            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">
              {data.paid_resources.length}
            </span>
          </div>
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'free' ? (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">🎓 Free Learning Resources</h2>
            <p className="text-gray-600 mb-8">
              Start your learning journey with these free tutorials, YouTube videos, and courses
            </p>

            {data.free_resources.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <p className="text-gray-500">No free resources available yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {resources.map((resource) => (
                  <a
                    key={resource.id}
                    href={resource.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <div className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="aspect-video bg-gray-100 overflow-hidden">
                        <img 
                          src={resource.image_url}
                          alt={`Resource ${resource.resource_number}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="225"%3E%3Crect fill="%23f3f4f6" width="400" height="225"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="14" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImage Not Found%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      </div>

                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-700">
                            Resource {resource.resource_number}
                          </span>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                            Free
                          </span>
                        </div>
                        <p className="text-purple-600 group-hover:text-purple-700 font-semibold mt-2">
                          Open Resource →
                        </p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {/* ✅ NEW: Pros & Cons for Free Resources */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-8 mb-12 border border-green-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Pros */}
                <div>
                  <h3 className="text-2xl font-bold text-green-700 mb-4">✅ PROS</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="text-green-600 font-bold text-lg">•</span>
                      <span className="text-gray-700"><strong>No Financial Investment:</strong> Learn without spending money on courses</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-green-600 font-bold text-lg">•</span>
                      <span className="text-gray-700"><strong>Flexible Learning:</strong> Access resources anytime, anywhere at your own pace</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-green-600 font-bold text-lg">•</span>
                      <span className="text-gray-700"><strong>Community Support:</strong> Access to community forums and peer learning</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-green-600 font-bold text-lg">•</span>
                      <span className="text-gray-700"><strong>Diverse Content:</strong> Multiple perspectives from different creators</span>
                    </li>
                  </ul>
                </div>

                {/* Cons */}
                <div>
                  <h3 className="text-2xl font-bold text-orange-600 mb-4">⚠️ CONS</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="text-orange-600 font-bold text-lg">•</span>
                      <span className="text-gray-700"><strong>Self-Motivation Required:</strong> Need consistent discipline to complete courses on your own</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-orange-600 font-bold text-lg">•</span>
                      <span className="text-gray-700"><strong>No Certification:</strong> Most free resources don't provide official certificates</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-orange-600 font-bold text-lg">•</span>
                      <span className="text-gray-700"><strong>Limited Guidance:</strong> Less personalized feedback and mentorship</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-orange-600 font-bold text-lg">•</span>
                      <span className="text-gray-700"><strong>Variable Quality:</strong> Quality and content organization can vary widely</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">💰 Recommended Paid Courses</h2>
            <p className="text-gray-600 mb-8">
              Accelerate your learning with these curated paid courses from industry experts
            </p>

            {data.paid_resources.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <p className="text-gray-500">No paid courses available yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {resources.map((resource) => (
                  <a
                    key={resource.id}
                    href={resource.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group"
                  >
                    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow-sm border overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="aspect-video bg-gradient-to-br from-purple-100 to-blue-100 overflow-hidden">
                        <img 
                          src={resource.image_url}
                          alt={`Course ${resource.resource_number}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="225"%3E%3Crect fill="%23f3f4f6" width="400" height="225"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="14" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImage Not Found%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      </div>

                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700">
                            Course {resource.resource_number}
                          </span>
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-semibold">
                            Paid
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-gray-600 text-sm">Enroll & Learn</p>
                          <svg className="w-4 h-4 text-purple-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {/* ✅ NEW: Pros & Cons for Paid Courses */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8 mb-12 border border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Pros */}
                <div>
                  <h3 className="text-2xl font-bold text-blue-700 mb-4">✅ PROS</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="text-blue-600 font-bold text-lg">•</span>
                      <span className="text-gray-700"><strong>Live Classes & Interaction:</strong> Direct access to instructors for live sessions and Q&A</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-blue-600 font-bold text-lg">•</span>
                      <span className="text-gray-700"><strong>Doubt Clarification:</strong> Get personalized help and immediate feedback on your progress</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-blue-600 font-bold text-lg">•</span>
                      <span className="text-gray-700"><strong>Structured Learning Path:</strong> Well-organized curriculum with clear learning objectives</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-blue-600 font-bold text-lg">•</span>
                      <span className="text-gray-700"><strong>Certification & Credibility:</strong> Recognized certificates that enhance your resume</span>
                    </li>
                  </ul>
                </div>

                {/* Cons */}
                <div>
                  <h3 className="text-2xl font-bold text-red-600 mb-4">⚠️ CONS</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="text-red-600 font-bold text-lg">•</span>
                      <span className="text-gray-700"><strong>Financial Investment:</strong> Requires spending money on courses and materials</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-red-600 font-bold text-lg">•</span>
                      <span className="text-gray-700"><strong>ROI Dependent on Effort:</strong> Value for money only if you give your 100% commitment</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-red-600 font-bold text-lg">•</span>
                      <span className="text-gray-700"><strong>Fixed Schedule:</strong> May have set class timings that don't match your availability</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-red-600 font-bold text-lg">•</span>
                      <span className="text-gray-700"><strong>Quality Varies:</strong> Not all paid courses are of equal quality despite the price</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ✅ NEW: Best Wishes Section */}
      <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-red-50 rounded-lg p-8 mb-8 border-2 border-amber-200 shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-amber-900 mb-4">🌟 Best Wishes for Your Learning Journey!</h2>
          <p className="text-lg text-amber-800 mb-6 leading-relaxed">
            Remember, every expert was once a beginner. Your decision to invest time and effort in learning <span className="font-bold">{data.skill.name}</span> is a step towards personal and professional growth.
          </p>
          <div className="space-y-3 text-amber-700 text-base">
            <p>✨ <strong>Stay consistent</strong> - Progress comes from daily dedication and practice</p>
            <p>💪 <strong>Embrace challenges</strong> - Difficulties are opportunities to learn and grow stronger</p>
            <p>🎯 <strong>Focus on understanding</strong> - Don't just memorize; understand the concepts deeply</p>
            <p>🤝 <strong>Connect with others</strong> - Join communities and learn from fellow learners</p>
            <p>🚀 <strong>Keep pushing forward</strong> - Your future self will thank you for the effort you put in today</p>
          </div>
          <p className="text-lg font-bold text-amber-900 mt-6">
            🌈 All the best! You've got this! 💖
          </p>
        </div>
      </div>

      {/* Back Button */}
      <div className="mt-12 text-center">
        <Link 
          href={`/skillstore/${skillId}`}
          className="text-purple-600 hover:text-purple-700 font-medium"
        >
          ← Back to Skill Details
        </Link>
      </div>
    </div>
  );
}
