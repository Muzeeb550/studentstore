'use client';

import { useState, useEffect } from 'react';

interface SkillStoreDashboardData {
  totalSkills: number;
  totalBanners: number;
  totalSkillDetails: number;
  recentSkills: number;
  recentActivity: Array<{
    id: number;
    name: string;
    created_at: string;
    admin_name: string;
  }>;
}

export default function AdminSkillStoreDashboard() {
  const [data, setData] = useState<SkillStoreDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('studentstore_token');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/admin/skillstore/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.status === 'success') {
        setData(result.data);
        setError('');
      } else {
        setError(result.message || 'Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
        <button 
          onClick={fetchDashboardData}
          className="mt-2 text-red-600 hover:text-red-800 font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">SkillStore Management</h1>
        <p className="text-gray-600">Manage skills, banners, and resources for students</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{data?.totalSkills || 0}</div>
          <div className="text-sm text-gray-600">Total Skills</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{data?.totalBanners || 0}</div>
          <div className="text-sm text-gray-600">Banners</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{data?.totalSkillDetails || 0}</div>
          <div className="text-sm text-gray-600">Details Added</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{data?.recentSkills || 0}</div>
          <div className="text-sm text-gray-600">Skills (7 days)</div>
        </div>
      </div>


      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <a 
          href="/admin/skillstore/banners" 
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg text-center font-medium transition-colors"
        >
          📊 Manage Banners
        </a>
        <a 
          href="/admin/skillstore/skills" 
          className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-lg text-center font-medium transition-colors"
        >
          🎓 Manage Skills
        </a>
      </div>


      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Skills Added</h2>
        </div>
        
        {data?.recentActivity && data.recentActivity.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {data.recentActivity.map((item) => (
              <div key={item.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-500">
                      Added by {item.admin_name}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-gray-500">
            No skills added yet
          </div>
        )}
      </div>
    </div>
  );
}
