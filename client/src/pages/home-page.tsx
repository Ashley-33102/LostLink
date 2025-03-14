import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Item } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { Loader2, Check, Trash2, Image as ImageIcon, Search } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: items, isLoading } = useQuery<Item[]>({
    queryKey: ["/api/items"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({ title: "Success", description: "Item deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markAsCompleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/items/${id}/status`, { status: "closed" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({ title: "Success", description: "Item marked as completed" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter items based on search term
  const filterItems = (items: Item[] | undefined, type: 'lost' | 'found'): Item[] => {
    if (!items) return [];
    return items.filter(item => 
      item.type === type && 
      item.status === 'open' &&
      (searchTerm === "" || item.title.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const lostItems = filterItems(items, 'lost');
  const foundItems = filterItems(items, 'found');

  const ItemCard = ({ item }: { item: Item }) => (
    <Card className="backdrop-blur-sm bg-card/95 hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{item.title}</span>
          <span className={`text-sm px-2 py-1 rounded ${
            item.type === 'lost' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
          }`}>
            {item.type.toUpperCase()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {item.imageUrl ? (
          <div className="mb-4">
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-64 object-contain rounded-lg bg-gray-50"
            />
          </div>
        ) : (
          <div className="mb-4 flex items-center justify-center h-64 bg-gray-50 rounded-lg">
            <ImageIcon className="h-16 w-16 text-gray-400" />
          </div>
        )}
        <p className="text-muted-foreground mb-2">{item.description}</p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">Location:</span>
            <span>{item.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Category:</span>
            <span>{item.category}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Contact:</span>
            <span>{item.contactNumber}</span>
          </div>
        </div>

        {item.userCnic === user?.cnic && (
          <div className="flex items-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAsCompleteMutation.mutate(item.id)}
              disabled={markAsCompleteMutation.isPending}
              className="hover:bg-primary/10"
            >
              <Check className="h-4 w-4 mr-1" />
              Mark as Complete
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => deleteMutation.mutate(item.id)}
              disabled={deleteMutation.isPending}
              className="hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
      <header className="border-b bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-md">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            <span className="bg-gradient-to-r from-gray-100 to-white bg-clip-text text-transparent font-serif tracking-wide">
              Lost & Found, <span className="font-semibold">Made Simple</span>
            </span>
          </h1>
          <div className="flex items-center gap-4">
            <Link href="/submit">
              <Button className="bg-white/10 hover:bg-white/20 text-white border-white/20">
                Submit Item
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => logoutMutation.mutate()}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search items by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Lost Items</h2>
              {lostItems.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    {searchTerm ? "No matching lost items found" : "No lost items reported"}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {lostItems.map((item) => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Found Items</h2>
              {foundItems.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    {searchTerm ? "No matching found items found" : "No found items reported"}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {foundItems.map((item) => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      <footer className="border-t bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-md">
        <div className="container mx-auto px-4 py-6 text-center text-gray-300">
          Here we connect people with their lost treasure
        </div>
      </footer>
    </div>
  );
}