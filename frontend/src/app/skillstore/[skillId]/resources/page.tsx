'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchSkillResources();
  }, []);

  const fetchSkillResources = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/skillstore/skills/${skillId}`);
      const result = await response.json();

      if (result.status === 'success') {
        setData(result.data);
        setError('');
      } else {
        setError(result.message || 'Skill not found');
      }
    } catch (error) {
      console.error('Fetch error:', error);
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          </div>
        )}
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
