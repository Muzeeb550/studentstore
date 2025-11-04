'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useBookmarks } from '../../context/BookmarkContext';

interface SkillData {
  skill: {
    id: number;
    name: string;
    card_image_url: string;
  };
  details: {
    description: string;
    roadmap_image_url: string;
    opportunities_image_url: string;
  };
  free_resources: Array<{
    id: number;
    resource_number: number;
    image_url: string;
    link_url: string;
  }>;
  paid_resources: Array<{
    id: number;
    resource_number: number;
    image_url: string;
    link_url: string;
  }>;
}

export default function SkillDetailsPage() {
  const params = useParams();
  const skillId = parseInt(params.skillId as string);

  const [data, setData] = useState<SkillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  // Use context instead of local state
  const { bookmarkedSkills, addBookmark, removeBookmark, checkBookmarks } = useBookmarks();

  useEffect(() => {
    const userStr = localStorage.getItem('studentstore_user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
    
    fetchSkillDetails();
  }, []);

  useEffect(() => {
    if (user) {
      checkBookmarks([skillId]);
    }
  }, [user, skillId, checkBookmarks]);

  const fetchSkillDetails = async () => {
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
      setError('Failed to load skill details');
    } finally {
      setLoading(false);
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      alert('Please login to bookmark skills');
      return;
    }

    // Use context methods
    if (bookmarkedSkills[skillId]) {
      await removeBookmark(skillId);
    } else {
      await addBookmark(skillId);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/skillstore" className="text-purple-600 hover:text-purple-700">
            ← Back to SkillStore
          </Link>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800 font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Header */}
      <div className="mb-8">
        <Link href="/skillstore" className="text-purple-600 hover:text-purple-700 mb-4 inline-block">
          ← Back to SkillStore
        </Link>
        
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">{data.skill.name}</h1>
          </div>
          
          <button
            onClick={handleBookmark}
            className={`p-3 rounded-lg transition-all ${
              bookmarkedSkills[skillId]
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 text-gray-600 hover:bg-red-500 hover:text-white'
            }`}
          >
            <svg className="w-6 h-6" fill={bookmarkedSkills[skillId] ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* About Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">About This Skill</h2>
        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{data.details.description}</p>
      </div>

      {/* Roadmap Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">📚 Learning Roadmap</h2>
        <p className="text-gray-600 mb-4">Here's what you'll learn step by step:</p>
        <img 
          src={data.details.roadmap_image_url}
          alt="Learning Roadmap"
          className="w-full rounded-lg border"
        />
      </div>

      {/* Opportunities Section */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">💼 Career Opportunities</h2>
        <p className="text-gray-600 mb-4">See the career paths and job opportunities available with this skill:</p>
        <img 
          src={data.details.opportunities_image_url}
          alt="Career Opportunities"
          className="w-full rounded-lg border"
        />
      </div>

      {/* Resources Button */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">📖 Learning Resources</h2>
        <p className="text-gray-600 mb-6">Access free tutorials and paid courses to master this skill:</p>
        
        <Link
          href={`/skillstore/${skillId}/resources`}
          className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          View Resources →
        </Link>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-8 text-white text-center mb-8">
        <h3 className="text-2xl font-bold mb-2">Ready to get started?</h3>
        <p className="mb-6">Check out the resources and choose your learning path</p>
        <button
          onClick={handleBookmark}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            bookmarkedSkills[skillId]
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-white text-purple-600 hover:bg-gray-100'
          }`}
        >
          {bookmarkedSkills[skillId] ? '✓ Skill Bookmarked' : '+ Bookmark This Skill'}
        </button>
      </div>

      {/* Footer Link */}
      <div className="text-center mb-8">
        <Link 
          href="/skillstore"
          className="text-purple-600 hover:text-purple-700 font-medium"
        >
          ← Explore More Skills
        </Link>
      </div>
    </div>
  );
}
