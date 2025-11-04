'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Resource {
  resource_number: number;
  image_url: string;
  link_url: string;
}

interface SkillDetailsFormData {
  skill_id: number;
  description: string;
  roadmap_image_url: string;
  opportunities_image_url: string;
  free_resources: Resource[];
  paid_resources: Resource[];
}

export default function CreateSkillDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const skillId = parseInt(params.skillId as string);

  const [skillName, setSkillName] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<SkillDetailsFormData>({
    skill_id: skillId,
    description: '',
    roadmap_image_url: '',
    opportunities_image_url: '',
    free_resources: [
      { resource_number: 1, image_url: '', link_url: '' },
      { resource_number: 2, image_url: '', link_url: '' },
      { resource_number: 3, image_url: '', link_url: '' }
    ],
    paid_resources: [
      { resource_number: 1, image_url: '', link_url: '' },
      { resource_number: 2, image_url: '', link_url: '' },
      { resource_number: 3, image_url: '', link_url: '' }
    ]
  });

  useEffect(() => {
    fetchSkillName();
  }, []);

  const fetchSkillName = async () => {
    try {
      const token = localStorage.getItem('studentstore_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/admin/skillstore/skills/${skillId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (result.status === 'success') {
        setSkillName(result.data.name);
      }
    } catch (error) {
      console.error('Fetch skill error:', error);
    }
  };

  const handleImageUpload = async (fieldName: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setUploading(fieldName);

    try {
      const token = localStorage.getItem('studentstore_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const authResponse = await fetch(`${apiUrl}/api/admin/imagekit-auth`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      const authResult = await authResponse.json();
      
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('fileName', `skill-details_${Date.now()}_${file.name}`);
      uploadData.append('folder', '/studentstore/skill-details');
      uploadData.append('token', authResult.token);
      uploadData.append('signature', authResult.signature);
      uploadData.append('expire', authResult.expire.toString());
      uploadData.append('publicKey', process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || '');

      const uploadResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        body: uploadData
      });

      const uploadResult = await uploadResponse.json();

      if (uploadResponse.ok) {
        setFormData(prev => ({
          ...prev,
          [fieldName]: uploadResult.url
        }));
      } else {
        throw new Error(uploadResult.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(null);
    }
  };

  const handleResourceImageUpload = async (
    type: 'free' | 'paid',
    index: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setUploading(`${type}-${index}`);

    try {
      const token = localStorage.getItem('studentstore_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const authResponse = await fetch(`${apiUrl}/api/admin/imagekit-auth`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      const authResult = await authResponse.json();
      
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('fileName', `resource_${Date.now()}_${file.name}`);
      uploadData.append('folder', '/studentstore/resources');
      uploadData.append('token', authResult.token);
      uploadData.append('signature', authResult.signature);
      uploadData.append('expire', authResult.expire.toString());
      uploadData.append('publicKey', process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || '');

      const uploadResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        body: uploadData
      });

      const uploadResult = await uploadResponse.json();

      if (uploadResponse.ok) {
        setFormData(prev => {
          const newData = { ...prev };
          if (type === 'free') {
            newData.free_resources[index].image_url = uploadResult.url;
          } else {
            newData.paid_resources[index].image_url = uploadResult.url;
          }
          return newData;
        });
      } else {
        throw new Error(uploadResult.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.description.trim()) {
      setError('Please enter a description');
      return;
    }

    if (!formData.roadmap_image_url) {
      setError('Please upload roadmap image');
      return;
    }

    if (!formData.opportunities_image_url) {
      setError('Please upload opportunities image');
      return;
    }

    // At least 1 free resource
    const freeWithData = formData.free_resources.filter(r => r.image_url && r.link_url);
    if (freeWithData.length === 0) {
      setError('Please add at least 1 free resource');
      return;
    }

    // At least 1 paid resource
    const paidWithData = formData.paid_resources.filter(r => r.image_url && r.link_url);
    if (paidWithData.length === 0) {
      setError('Please add at least 1 paid resource');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('studentstore_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/admin/skillstore/skill-details`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          skill_id: skillId,
          description: formData.description,
          roadmap_image_url: formData.roadmap_image_url,
          opportunities_image_url: formData.opportunities_image_url,
          free_resources: freeWithData,
          paid_resources: paidWithData
        })
      });

      const result = await response.json();

      if (result.status === 'success') {
        alert('Skill details saved successfully!');
        router.push('/admin/skillstore/skills');
      } else {
        setError(result.message || 'Failed to save details');
      }
    } catch (error) {
      console.error('Save details error:', error);
      setError('Failed to save details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add Skill Details</h1>
          <p className="text-gray-600">{skillName}</p>
        </div>
        <a 
          href="/admin/skillstore/skills"
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          ← Back to Skills
        </a>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border">
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          
          {/* Description Section */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">About This Skill</h2>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Describe what this skill is about, why students should learn it, and what they'll be able to do..."
              required
            />
          </div>

          {/* Roadmap Section */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">📚 Learning Roadmap (INPUT)</h2>
            <p className="text-sm text-gray-600 mb-4">Upload an image showing the learning path/roadmap</p>
            
            {formData.roadmap_image_url && (
              <div className="mb-4">
                <img 
                  src={formData.roadmap_image_url} 
                  alt="Roadmap"
                  className="w-full h-64 object-cover rounded-lg border"
                />
              </div>
            )}
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-500 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload('roadmap_image_url', e)}
                disabled={uploading === 'roadmap_image_url'}
                className="hidden"
                id="roadmap-upload"
              />
              <label 
                htmlFor="roadmap-upload"
                className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
              >
                {uploading === 'roadmap_image_url' ? 'Uploading...' : 'Upload Roadmap'}
              </label>
            </div>
          </div>

          {/* Opportunities Section */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">💼 Career Opportunities (OUTPUT)</h2>
            <p className="text-sm text-gray-600 mb-4">Upload an image showing job opportunities/career paths</p>
            
            {formData.opportunities_image_url && (
              <div className="mb-4">
                <img 
                  src={formData.opportunities_image_url} 
                  alt="Opportunities"
                  className="w-full h-64 object-cover rounded-lg border"
                />
              </div>
            )}
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-500 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload('opportunities_image_url', e)}
                disabled={uploading === 'opportunities_image_url'}
                className="hidden"
                id="opportunities-upload"
              />
              <label 
                htmlFor="opportunities-upload"
                className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
              >
                {uploading === 'opportunities_image_url' ? 'Uploading...' : 'Upload Opportunities'}
              </label>
            </div>
          </div>

          {/* Free Resources Section */}
          <div className="border-t pt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🎓 Free Resources</h2>
            <p className="text-sm text-gray-600 mb-4">Add YouTube videos, tutorials, or free courses (at least 1 required)</p>
            
            <div className="space-y-6">
              {formData.free_resources.map((resource, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="text-sm font-semibold text-gray-700 mb-3">Resource {index + 1}</div>
                  
                  <div className="space-y-3">
                    {/* Thumbnail */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Thumbnail Image
                      </label>
                      {resource.image_url && (
                        <img 
                          src={resource.image_url} 
                          alt={`Resource ${index + 1}`}
                          className="w-24 h-24 object-cover rounded mb-2"
                        />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleResourceImageUpload('free', index, e)}
                        disabled={uploading === `free-${index}`}
                        className="block w-full text-sm text-gray-500"
                      />
                    </div>

                    {/* Link */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Resource Link {resource.image_url && resource.link_url && '✓'}
                      </label>
                      <input
                        type="url"
                        value={resource.link_url}
                        onChange={(e) => setFormData(prev => {
                          const newData = { ...prev };
                          newData.free_resources[index].link_url = e.target.value;
                          return newData;
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="https://youtube.com/... or https://course.com/..."
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Paid Resources Section */}
          <div className="border-t pt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">💰 Paid Courses (Affiliate Links)</h2>
            <p className="text-sm text-gray-600 mb-4">Add Udemy, Coursera, etc. with affiliate links (at least 1 required)</p>
            
            <div className="space-y-6">
              {formData.paid_resources.map((resource, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="text-sm font-semibold text-gray-700 mb-3">Course {index + 1}</div>
                  
                  <div className="space-y-3">
                    {/* Thumbnail */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Course Image
                      </label>
                      {resource.image_url && (
                        <img 
                          src={resource.image_url} 
                          alt={`Course ${index + 1}`}
                          className="w-24 h-24 object-cover rounded mb-2"
                        />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleResourceImageUpload('paid', index, e)}
                        disabled={uploading === `paid-${index}`}
                        className="block w-full text-sm text-gray-500"
                      />
                    </div>

                    {/* Link */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Affiliate Link {resource.image_url && resource.link_url && '✓'}
                      </label>
                      <input
                        type="url"
                        value={resource.link_url}
                        onChange={(e) => setFormData(prev => {
                          const newData = { ...prev };
                          newData.paid_resources[index].link_url = e.target.value;
                          return newData;
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="https://udemy.com/course/... (affiliate link)"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <a
              href="/admin/skillstore/skills"
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </a>
            <button
              type="submit"
              disabled={loading || uploading !== null}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Skill Details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
