
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Upload, Link, Send, Image as ImageIcon, Loader2 } from 'lucide-react';

interface QAResponse {
  question: string;
  answer: string;
  imageUrl: string;
  timestamp: Date;
}

const MultimodalQA = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [question, setQuestion] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [responses, setResponses] = useState<QAResponse[]>([]);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Using the provided Gemini API key
  const apiKey = "AIzaSyBYkady5hwkgdb-uA7i9ax2IH5_rQwPKso";

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setImageFile(file);
        setImageUrl('');
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file.",
          variant: "destructive",
        });
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('image/')) {
        setImageFile(file);
        setImageUrl('');
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file.",
          variant: "destructive",
        });
      }
    }
  };

  const getImageBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const convertImageUrlToBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw new Error('Failed to convert image URL to base64');
    }
  };

  const handleSubmit = async () => {
    if (!question.trim()) {
      toast({
        title: "Question required",
        description: "Please enter a question about the image.",
        variant: "destructive",
      });
      return;
    }

    if (!imageFile && !imageUrl) {
      toast({
        title: "Image required",
        description: "Please upload an image or provide an image URL.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      let imageBase64 = '';
      let imageMimeType = 'image/jpeg';
      let displayImageUrl = '';

      if (imageFile) {
        imageBase64 = await getImageBase64(imageFile);
        imageMimeType = imageFile.type;
        displayImageUrl = URL.createObjectURL(imageFile);
      } else if (imageUrl) {
        imageBase64 = await convertImageUrlToBase64(imageUrl);
        displayImageUrl = imageUrl;
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: question
                },
                {
                  inline_data: {
                    mime_type: imageMimeType,
                    data: imageBase64
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1000,
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received.';

      const newResponse: QAResponse = {
        question,
        answer,
        imageUrl: displayImageUrl,
        timestamp: new Date()
      };

      setResponses(prev => [newResponse, ...prev]);
      setQuestion('');
      
      toast({
        title: "Response received!",
        description: "Your question has been answered by Gemini 2.0 Flash.",
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to get response from Gemini. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const currentImageUrl = imageFile ? URL.createObjectURL(imageFile) : imageUrl;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Multimodal QA Assistant
          </h1>
          <p className="text-xl text-gray-600">
            Upload an image and ask questions about it using Gemini 2.0 Flash
          </p>
        </div>

        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Image & Question Input
            </CardTitle>
            <CardDescription>
              Upload an image or provide a URL, then ask a question about it
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Image Upload Area */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Upload Image</label>
                <div
                  className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    Drag & drop an image here, or{' '}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      click to browse
                    </button>
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Or Image URL</label>
                <div className="space-y-3">
                  <div className="relative">
                    <Link className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="https://example.com/image.jpg"
                      value={imageUrl}
                      onChange={(e) => {
                        setImageUrl(e.target.value);
                        if (e.target.value) setImageFile(null);
                      }}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Image Preview */}
            {currentImageUrl && (
              <div className="mt-6">
                <label className="block text-sm font-medium mb-2">Preview</label>
                <div className="relative max-w-md">
                  <img
                    src={currentImageUrl}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg border shadow-sm"
                  />
                </div>
              </div>
            )}

            <Separator />

            {/* Question Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Your Question</label>
              <div className="flex gap-3">
                <Textarea
                  placeholder="What do you see in this image? Describe the main objects, colors, and scene..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !question.trim() || (!imageFile && !imageUrl)}
                  className="px-6 h-auto"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Responses Section */}
        {responses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Responses</CardTitle>
              <CardDescription>
                AI-generated answers about your images using Gemini 2.0 Flash
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {responses.map((response, index) => (
                <div key={index} className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-4">
                    <img
                      src={response.imageUrl}
                      alt="Query image"
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 space-y-2">
                      <div>
                        <Badge variant="outline" className="mb-2">
                          Question
                        </Badge>
                        <p className="text-sm font-medium text-gray-900">
                          {response.question}
                        </p>
                      </div>
                      <div>
                        <Badge variant="default" className="mb-2">
                          Answer
                        </Badge>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {response.answer}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {response.timestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MultimodalQA;
