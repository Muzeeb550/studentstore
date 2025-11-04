'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface SkillFormData {
  name: string;
  card_image_url: string;
}

export default function EditSkillPage() {
  const router = useRouter();
  const params = useParams();
  const skillId = parseInt(params.skillId as string);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<SkillFormData>({
    name: '',
    card_image_url: ''
  });

  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    fetchSkillData();
  }, []);

  const fetchSkillData = async () => {
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
        const skill = result.data;
        setFormData({
          name: skill.name,
          card_image_url: skill.card_image_url
        });
        setImagePreview(skill.card_image_url);
        setError('');
      } else {
        setError(result.message || 'Skill not found');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setError('Failed to load skill');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

    setUploading(true);

    try {
      const token = localStorage.getItem('studentstore_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const authResponse = await fetch(`${apiUrl}/api/admin/imagekit-auth`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      const authResult = await authResponse.json();
      
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('fileName', `skill_${Date.now()}_${file.name}`);
      uploadData.append('folder', '/studentstore/skills');
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
          card_image_url: uploadResult.url
        }));
        setImagePreview(uploadResult.url);
      } else {
        throw new Error(uploadResult.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Please enter a skill name');
      return;
    }

    if (!formData.card_image_url) {
      setError('Please upload a skill card image');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('studentstore_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/admin/skillstore/skills/${skillId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.status === 'success') {
        alert('Skill updated successfully!');
        router.push('/admin/skillstore/skills');
      } else {
        setError(result.message || 'Failed to update skill');
      }
    } catch (error) {
      console.error('Update skill error:', error);
      setError('Failed to update skill. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error && !formData.card_image_url) {
    return (
      <div className="max-w-2xl mx-auto">
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
    <div className="max-w-2xl mx-auto">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Skill Card</h1>
          <p className="text-gray-600">Update skill information</p>
        </div>
        <Link 
          href="/admin/skillstore/skills"
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          ← Back to Skills
        </Link>
      </div>

      {/* Error Display */}
      {error && formData.card_image_url && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Edit Skill Form */}
      <div className="bg-white rounded-lg shadow-sm border">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Skill Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Skill Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g., React Development"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Update skill name if needed</p>
          </div>

          {/* Card Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Card Image <span className="text-red-500">*</span>
            </label>
            
            {imagePreview && (
              <div className="mb-4">
                <img 
                  src={imagePreview} 
                  alt="Skill preview"
                  className="w-full h-48 object-cover rounded-lg border"
                />
              </div>
            )}
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-500 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
                id="image-upload"
              />
              <label 
                htmlFor="image-upload"
                className="inline-block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
              >
                {uploading ? 'Uploading...' : 'Change Image'}
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">Recommended size: 400x400px (square)</p>
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
              disabled={submitting || uploading}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {submitting ? 'Updating...' : 'Update Skill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
