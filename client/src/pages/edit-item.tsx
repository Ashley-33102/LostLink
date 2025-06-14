'use client'

import { useEffect, useState } from 'react'
import { useRoute, useLocation } from 'wouter'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { insertItemSchema } from '@shared/schema'
import { z } from 'zod'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { queryClient } from '@/lib/queryClient'
import { useToast } from '@/hooks/use-toast' // ✅ Import useToast

// ✅ API calls
const getItemById = async (id: string) => {
  const res = await fetch(`/api/items/${id}`)
  if (!res.ok) throw new Error('Failed to fetch item')
  return res.json()
}

const updateItem = async (id: string, formData: FormData) => {
  const res = await fetch(`/api/items/${id}`, {
    method: 'PUT',
    body: formData,
  })
  if (!res.ok) throw new Error('Failed to update item')
  return res.json()
}

export default function EditItemPage() {
  const [match, params] = useRoute('/edit/:id')
  const itemId = params?.id
  const [, navigate] = useLocation()
  const [open, setOpen] = useState(true)
  const [picture, setPicture] = useState<File | null>(null)
  const { toast } = useToast() // ✅ Use toast hook

  const { register, handleSubmit, setValue } = useForm<z.infer<typeof insertItemSchema>>({
    resolver: zodResolver(insertItemSchema),
    defaultValues: {
      type: 'lost',
      title: '',
      description: '',
      category: 'other',
      location: '',
      contactNumber: '',
      imageUrl: '',
    },
  })

  const { data: item, isLoading, isError } = useQuery({
    queryKey: ['item', itemId],
    queryFn: () => getItemById(itemId!),
    enabled: !!itemId,
  })

  useEffect(() => {
    if (item) {
      setValue('title', item.title)
      setValue('description', item.description)
      setValue('location', item.location)
      setValue('category', item.category)
      setValue('type', item.type)
      setValue('contactNumber', item.contactNumber)
      setValue('imageUrl', item.imageUrl || '')
    }
  }, [item, setValue])

  const { mutate: editItem, isPending } = useMutation({
    mutationFn: async (data: z.infer<typeof insertItemSchema>) => {
      const formData = new FormData()
      formData.append('title', data.title)
      formData.append('description', data.description)
      formData.append('location', data.location)
      formData.append('category', data.category)
      formData.append('type', data.type)
      formData.append('contactNumber', data.contactNumber)
      formData.append('imageUrl', data.imageUrl || '')
      if (picture) formData.append('picture', picture)

      await updateItem(itemId!, formData)
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Item updated successfully' }) // ✅ Match other alerts
      queryClient.invalidateQueries({ queryKey: ['/api/items'] })
      setOpen(false)
      navigate('/')
    },
    onError: (error: Error) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const onSubmit = (data: z.infer<typeof insertItemSchema>) => {
    editItem(data)
  }

  if (!match || isError)
    return <p className="text-center text-red-500">Item not found</p>
  if (isLoading) return <p className="text-center">Loading item...</p>

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Type</Label>
            <Select
              onValueChange={(value) => setValue('type', value as 'lost' | 'found')}
              defaultValue={item?.type || 'lost'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lost">Lost</SelectItem>
                <SelectItem value="found">Found</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register('title')} required />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} />
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input id="location" {...register('location')} required />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Input id="category" {...register('category')} />
          </div>
          <div>
            <Label htmlFor="contactNumber">Contact Number</Label>
            <Input id="contactNumber" {...register('contactNumber')} />
          </div>
          <div>
            <Label htmlFor="picture">Picture</Label>
            <Input
              id="picture"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) setPicture(file)
              }}
            />
          </div>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? <Loader2 className="animate-spin" /> : 'Update Item'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}