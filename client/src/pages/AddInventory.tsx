import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/_core/hooks/useAuth';
import { collectibleCategories } from '../../../drizzle/schema';
import { X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';

export default function AddInventory() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const createListingMutation = trpc.market.createListing.useMutation();
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [title, setTitle] = useState('');
  const [condition, setCondition] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [isGraded, setIsGraded] = useState<string>('');
  const [gradingCompany, setGradingCompany] = useState<string>('');
  const [grade, setGrade] = useState<string>('');
  const [certificationNumber, setCertificationNumber] = useState<string>('');

  // Reset form on component mount
  useEffect(() => {
    resetForm();
  }, []);

  const resetForm = () => {
    setSelectedCategory('');
    setTitle('');
    setCondition('');
    setDescription('');
    setEstimatedValue('');
    setErrors({});
    setIsGraded('');
    setGradingCompany('');
    setGrade('');
    setCertificationNumber('');
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setIsGraded('');
    setGradingCompany('');
    setGrade('');
    setCertificationNumber('');
  };

  const renderConditionalFields = () => {
    if (!selectedCategory) return null;

    const fields: React.ReactNode[] = [];
    const gradingCategories = ['Sports Cards', 'Comic Books', 'Pokemon Cards', 'Coins', 'Stamps'];

    if (gradingCategories.includes(selectedCategory)) {
      fields.push(
        <div key="is-graded">
          <label className="block text-sm font-medium mb-2">Is Graded?</label>
          <Select value={isGraded} onValueChange={setIsGraded}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );

      if (isGraded === 'yes') {
        fields.push(
          <div key="grading-company">
            <label className="block text-sm font-medium mb-2">Grading Company</label>
            <Input
              placeholder="e.g., PSA, BGS, CGC"
              value={gradingCompany}
              onChange={(e) => setGradingCompany(e.target.value)}
            />
          </div>
        );

        fields.push(
          <div key="grade">
            <label className="block text-sm font-medium mb-2">Grade</label>
            <Input
              placeholder="e.g., 9.5, 10"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            />
          </div>
        );

        fields.push(
          <div key="certification-number">
            <label className="block text-sm font-medium mb-2">Certification Number</label>
            <Input
              placeholder="Enter certification number"
              value={certificationNumber}
              onChange={(e) => setCertificationNumber(e.target.value)}
            />
          </div>
        );
      }
    }

    return fields;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedCategory) newErrors.category = 'Category is required';
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!condition) newErrors.condition = 'Condition is required';
    if (photos.length === 0) newErrors.photos = 'At least one photo is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      const validFiles = newFiles.filter(file => file.type.startsWith('image/'));
      
      if (validFiles.length !== newFiles.length) {
        setErrors(prev => ({ ...prev, photos: 'Only image files are allowed' }));
      }

      setPhotos(prev => [...prev, ...validFiles]);

      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreviewUrls(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert photos to base64 for upload
      const photosWithBase64 = await Promise.all(
        photos.map(async (photo) => {
          return new Promise<{ name: string; type: string; contentBase64: string }>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve({
                name: photo.name,
                type: photo.type,
                contentBase64: base64,
              });
            };
            reader.readAsDataURL(photo);
          });
        })
      );

      // Submit to backend
      await createListingMutation.mutateAsync({
        title,
        category: selectedCategory as any,
        itemType: selectedCategory,
        condition: condition as any,
        description,
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
        photos: photosWithBase64,
      });

      alert('Item added successfully!');
      resetForm();
      navigate('/my-inventory');
    } catch (error: any) {
      console.error('Error submitting form:', error);
      const errorMessage = error?.message || 'Failed to submit form. Please try again.';
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // TODO: Implement draft saving logic with API call
      console.log('Draft saved:', {
        category: selectedCategory,
        title,
        condition,
        description,
        estimatedValue,
      });
      alert('Draft saved successfully!');
    } catch (error) {
      console.error('Error saving draft:', error);
      setErrors({ submit: 'Failed to save draft. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8">
          <p className="text-lg">Please sign in to add items to your inventory.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Add to Your Inventory</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {errors.submit && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {errors.submit}
            </div>
          )}

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Category <span className="text-white">*</span>
            </label>
            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {collectibleCategories.map((category: string) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Title <span className="text-white">*</span>
            </label>
            <Input
              type="text"
              placeholder="Enter item title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={errors.title ? 'border-red-500' : ''}
              required
            />
            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Condition <span className="text-white">*</span>
            </label>
            <Select value={condition} onValueChange={setCondition}>
              <SelectTrigger className={errors.condition ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mint">Mint</SelectItem>
                <SelectItem value="near-mint">Near Mint</SelectItem>
                <SelectItem value="excellent">Excellent</SelectItem>
                <SelectItem value="very-good">Very Good</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="fair">Fair</SelectItem>
                <SelectItem value="poor">Poor</SelectItem>
              </SelectContent>
            </Select>
            {errors.condition && <p className="text-red-500 text-sm mt-1">{errors.condition}</p>}
          </div>

          {/* Conditional Fields */}
          {renderConditionalFields()}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <Textarea
              placeholder="Enter item description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          {/* Estimated Value */}
          <div>
            <label className="block text-sm font-medium mb-2">Estimated Value</label>
            <Input
              type="number"
              placeholder="Enter estimated value"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              step="0.01"
              min="0"
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Photos <span className="text-white">*</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
                id="photo-input"
              />
              <label htmlFor="photo-input" className="cursor-pointer">
                <p className="text-gray-600">Click to upload or drag and drop</p>
                <p className="text-sm text-gray-500">PNG, JPG, GIF up to 10MB each</p>
              </label>
            </div>
            {errors.photos && <p className="text-red-500 text-sm mt-1">{errors.photos}</p>}

            {/* Photo Preview */}
            {photoPreviewUrls.length > 0 && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                {photoPreviewUrls.map((url, index) => (
                  <div key={index} className="relative">
                    <img src={url} alt={`Preview ${index + 1}`} className="w-full h-32 object-cover rounded" />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6">
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Item'}
            </Button>
            <Button type="button" variant="outline" className="flex-1" onClick={handleSaveDraft} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save as Draft'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
