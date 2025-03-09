import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { insertItemSchema } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { UploadCloud } from "lucide-react";

export default function SubmitItem() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const form = useForm({
    resolver: zodResolver(insertItemSchema),
    defaultValues: {
      type: "lost",
      title: "",
      description: "",
      category: "other",
      location: "",
      contactNumber: "",
      imageUrl: "",
    },
  });

  const handleImageChange = (file: File) => {
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image size should be less than 5MB",
          variant: "destructive",
        });
        return;
      }

      setSelectedImage(file);
      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleImageChange(files[0]);
    }
  };

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      let imageUrl = "";

      // Upload image if selected
      if (selectedImage) {
        const formData = new FormData();
        formData.append("image", selectedImage);

        try {
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: formData,
            credentials: "include",
          });

          if (!uploadRes.ok) {
            throw new Error("Failed to upload image");
          }

          const uploadData = await uploadRes.json();
          imageUrl = uploadData.url;
        } catch (error) {
          console.error("Image upload failed:", error);
          throw new Error("Failed to upload image");
        }
      }

      // Submit item with image URL if uploaded
      const itemData = {
        ...data,
        imageUrl: imageUrl || undefined,
      };

      const res = await apiRequest("POST", "/api/items", itemData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({ title: "Success", description: "Item submitted successfully" });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Submit Item
            </CardTitle>
            <Link href="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => submitMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="lost">Lost Item</SelectItem>
                        <SelectItem value="found">Found Item</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="electronics">Electronics</SelectItem>
                        <SelectItem value="clothing">Clothing</SelectItem>
                        <SelectItem value="accessories">Accessories</SelectItem>
                        <SelectItem value="documents">Documents</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Image Upload Section with Drag & Drop */}
              <div className="space-y-2">
                <FormLabel>Item Image</FormLabel>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                    isDragging
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
                  }`}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files && handleImageChange(e.target.files[0])}
                    className="hidden"
                    id="imageUpload"
                  />
                  <label
                    htmlFor="imageUpload"
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    {imagePreview ? (
                      <div className="space-y-4 w-full">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full max-w-sm mx-auto h-48 object-cover rounded-lg"
                        />
                        <p className="text-sm text-center text-gray-500">
                          Click or drag to replace the image
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-4">
                        <UploadCloud className="h-12 w-12 text-gray-400" />
                        <div className="text-center">
                          <p className="text-gray-600 font-medium">
                            Drag and drop your image here, or click to select
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Supports: JPG, PNG, WEBP (max 5MB)
                          </p>
                        </div>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitMutation.isPending}>
                {submitMutation.isPending ? "Submitting..." : "Submit Item"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}