'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Resource {
  id: number;
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

export default function EditSkillDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const skillId = parseInt(params.skillId as string);

  const [skillName, setSkillName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<SkillDetailsFormData>({
    skill_id: skillId,
    description: '',
    roadmap_image_url: '',
    opportunities_image_url: '',
    free_resources: [],
    paid_resources: []
  });

  useEffect(() => {
    fetchSkillDetails();
  }, []);

  const fetchSkillDetails = async () => {
    try {
      const token = localStorage.getItem('studentstore_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/admin/skillstore/skill-details/${skillId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.status === 'success') {
        setSkillName(result.data.skill_name);
        setFormData({
          skill_id: skillId,
          description: result.data.description,
          roadmap_image_url: result.data.roadmap_image_url,
          opportunities_image_url: result.data.opportunities_image_url,
          free_resources: result.data.free_resources,
          paid_resources: result.data.paid_resources
        });
        setError('');
      } else {
        setError(result.message || 'Skill details not found');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setError('Failed to load skill details');
    } finally {
      setLoading(false);
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

  const addFreeResource = () => {
    setFormData(prev => ({
      ...prev,
      free_resources: [
        ...prev.free_resources,
        { 
          id: Date.now(), 
          resource_number: prev.free_resources.length + 1, 
          image_url: '', 
          link_url: '' 
        }
      ]
    }));
  };

  const removeFreeResource = (index: number) => {
    setFormData(prev => ({
      ...prev,
      free_resources: prev.free_resources.filter((_, i) => i !== index)
    }));
  };

  const addPaidResource = () => {
    setFormData(prev => ({
      ...prev,
      paid_resources: [
        ...prev.paid_resources,
        { 
          id: Date.now(), 
          resource_number: prev.paid_resources.length + 1, 
          image_url: '', 
          link_url: '' 
        }
      ]
    }));
  };

  const removePaidResource = (index: number) => {
    setFormData(prev => ({
      ...prev,
      paid_resources: prev.paid_resources.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

    const freeWithData = formData.free_resources.filter(r => r.image_url && r.link_url);
    if (freeWithData.length === 0) {
      setError('Please add at least 1 free resource');
      return;
    }

    const paidWithData = formData.paid_resources.filter(r => r.image_url && r.link_url);
    if (paidWithData.length === 0) {
      setError('Please add at least 1 paid resource');
      return;
    }

    setSubmitting(true);
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
        alert('Skill details updated successfully!');
        router.push('/admin/skillstore/skills');
      } else {
        setError(result.message || 'Failed to update details');
      }
    } catch (error) {
      console.error('Update details error:', error);
      setError('Failed to update details. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error && !formData.description) {
    return (
      <div className="max-w-4xl mx-auto">
        <Link href="/admin/skillstore/skills" className="text-blue-600 mb-4 inline-block">
          ← Back to Skills
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Skill Details</h1>
          <p className="text-gray-600">{skillName}</p>
        </div>
        <Link 
          href="/admin/skillstore/skills"
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          ← Back to Skills
        </Link>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Edit Form */}
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
              required
            />
          </div>

          {/* Roadmap Section */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">📚 Learning Roadmap (INPUT)</h2>
            {formData.roadmap_image_url && (
              <div className="mb-4">
                <img 
                  src={formData.roadmap_image_url} 
                  alt="Roadmap"
                  className="w-full h-64 object-cover rounded-lg border"
                />
              </div>
            )}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
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
                {uploading === 'roadmap_image_url' ? 'Uploading...' : 'Change Roadmap'}
              </label>
            </div>
          </div>

          {/* Opportunities Section */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">💼 Career Opportunities (OUTPUT)</h2>
            {formData.opportunities_image_url && (
              <div className="mb-4">
                <img 
                  src={formData.opportunities_image_url} 
                  alt="Opportunities"
                  className="w-full h-64 object-cover rounded-lg border"
                />
              </div>
            )}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
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
                {uploading === 'opportunities_image_url' ? 'Uploading...' : 'Change Opportunities'}
              </label>
            </div>
          </div>

          {/* Free Resources Section */}
          <div className="border-t pt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">🎓 Free Resources</h2>
              <button
                type="button"
                onClick={addFreeResource}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                + Add Resource
              </button>
            </div>
            
            <div className="space-y-4">
              {formData.free_resources.length === 0 ? (
                <p className="text-gray-500">No free resources added. Click "+ Add Resource" to add one.</p>
              ) : (
                formData.free_resources.map((resource, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="text-sm font-semibold text-gray-700">Resource {index + 1}</div>
                      <button
                        type="button"
                        onClick={() => removeFreeResource(index)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Thumbnail */}
                      <div>
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
                      <input
                        type="url"
                        value={resource.link_url}
                        onChange={(e) => setFormData(prev => {
                          const newData = { ...prev };
                          newData.free_resources[index].link_url = e.target.value;
                          return newData;
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Resource URL"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Paid Resources Section */}
          <div className="border-t pt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">💰 Paid Courses</h2>
              <button
                type="button"
                onClick={addPaidResource}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                + Add Course
              </button>
            </div>
            
            <div className="space-y-4">
              {formData.paid_resources.length === 0 ? (
                <p className="text-gray-500">No paid courses added. Click "+ Add Course" to add one.</p>
              ) : (
                formData.paid_resources.map((resource, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="text-sm font-semibold text-gray-700">Course {index + 1}</div>
                      <button
                        type="button"
                        onClick={() => removePaidResource(index)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Thumbnail */}
                      <div>
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
                      <input
                        type="url"
                        value={resource.link_url}
                        onChange={(e) => setFormData(prev => {
                          const newData = { ...prev };
                          newData.paid_resources[index].link_url = e.target.value;
                          return newData;
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Course URL (affiliate link)"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Link
              href="/admin/skillstore/skills"
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting || uploading !== null}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {submitting ? 'Updating...' : 'Update Details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
