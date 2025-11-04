'use client';

import { useState, useEffect } from 'react';

interface Skill {
  id: number;
  name: string;
  card_image_url: string;
  created_at: string;
  updated_at: string;
  admin_name: string;
  has_details: string;
  free_resources_count: string;
  paid_resources_count: string;
}

export default function SkillsListPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      const token = localStorage.getItem('studentstore_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/admin/skillstore/skills`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.status === 'success') {
        setSkills(result.data);
        setError('');
      } else {
        setError(result.message || 'Failed to load skills');
      }
    } catch (error) {
      console.error('Fetch skills error:', error);
      setError('Failed to load skills');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this skill? All related details and resources will be deleted.')) {
      return;
    }

    setDeleteLoading(id);
    try {
      const token = localStorage.getItem('studentstore_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/admin/skillstore/skills/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.status === 'success') {
        alert('Skill deleted successfully');
        fetchSkills();
      } else {
        alert(result.message || 'Failed to delete skill');
      }
    } catch (error) {
      console.error('Delete skill error:', error);
      alert('Failed to delete skill');
    } finally {
      setDeleteLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Skill Cards</h1>
          <p className="text-gray-600">Manage skill cards displayed on SkillStore homepage</p>
        </div>
        <div className="flex space-x-3">
          <a 
            href="/admin/skillstore"
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            ← Back
          </a>
          <a 
            href="/admin/skillstore/skills/create"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Create Skill
          </a>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Skills Grid */}
      {skills.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <p className="text-gray-500 mb-4">No skills created yet</p>
          <a 
            href="/admin/skillstore/skills/create"
            className="inline-block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Create First Skill
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {skills.map((skill) => (
            <div key={skill.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {/* Skill Card Image */}
              <div className="aspect-square bg-gray-100">
                <img 
                  src={skill.card_image_url} 
                  alt={skill.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f3f4f6" width="400" height="400"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="18" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3EImage Not Found%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>

              {/* Skill Info */}
              <div className="p-4">
                <h3 className="text-lg font-bold text-gray-900 mb-3">{skill.name}</h3>
                
                <div className="space-y-2 mb-4">
                  <div className="text-sm">
                    <span className="text-gray-600">Details:</span>
                    <span className={`ml-2 font-medium ${skill.has_details === '1' ? 'text-green-600' : 'text-orange-600'}`}>
                      {skill.has_details === '1' ? '✓ Added' : '✗ Not Added'}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Free Resources:</span>
                    <span className="ml-2 font-medium">{skill.free_resources_count}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">Paid Resources:</span>
                    <span className="ml-2 font-medium">{skill.paid_resources_count}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    By {skill.admin_name}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col space-y-2">
                  <a
                    href={`/admin/skillstore/skills/edit/${skill.id}`}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium text-center transition-colors"
                  >
                    Edit Card
                  </a>
                  {skill.has_details === '0' ? (
                    <a
                      href={`/admin/skillstore/skill-details/create/${skill.id}`}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-sm font-medium text-center transition-colors"
                    >
                      + Add Details
                    </a>
                  ) : (
                    <a
                      href={`/admin/skillstore/skill-details/edit/${skill.id}`}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-sm font-medium text-center transition-colors"
                    >
                      Edit Details
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(skill.id)}
                    disabled={deleteLoading === skill.id}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {deleteLoading === skill.id ? 'Deleting...' : 'Delete Skill'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
