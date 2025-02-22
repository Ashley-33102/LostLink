import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Item } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";
import { useState } from "react";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [type, setType] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");

  const { data: items, isLoading } = useQuery<Item[]>({
    queryKey: ["/api/items", { type: type === "all" ? "" : type, category: category === "all" ? "" : category }],
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Lost & Found, made simple
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">Welcome, {user?.username}</span>
            <Button variant="outline" onClick={() => logoutMutation.mutate()}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="lost">Lost Items</SelectItem>
                <SelectItem value="found">Found Items</SelectItem>
              </SelectContent>
            </Select>

            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="electronics">Electronics</SelectItem>
                <SelectItem value="clothing">Clothing</SelectItem>
                <SelectItem value="accessories">Accessories</SelectItem>
                <SelectItem value="documents">Documents</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Link href="/submit">
            <Button>Submit Item</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : items?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No items found matching your filters
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items?.map((item) => (
              <Card key={item.id} className="backdrop-blur-sm bg-card/95">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{item.title}</span>
                    <span className={`text-sm px-2 py-1 rounded ${item.type === 'lost' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                      {item.type.toUpperCase()}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-2">{item.description}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Location:</span>
                    <span>{item.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <span className="font-medium">Category:</span>
                    <span>{item.category}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t bg-muted/50">
        <div className="container mx-auto px-4 py-6 text-center text-muted-foreground">
          Here we connect people with their lost treasure
        </div>
      </footer>
    </div>
  );
}