import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { AuthorizedCnic } from "@shared/schema";
import { insertUserSchema, insertAuthorizedCnicSchema } from "@shared/schema";
import { Redirect } from "wouter";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formError, setFormError] = useState("");

  // Query to check if admin exists
  const { data: adminExists, isLoading: checkingAdmin } = useQuery({
    queryKey: ["/api/admin/exists"],
    retry: false,
  });

  const adminForm = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      cnic: "",
    },
  });

  const cnicForm = useForm({
    resolver: zodResolver(insertAuthorizedCnicSchema),
    defaultValues: {
      cnic: "",
    },
  });

  const { data: authorizedCnics = [], isLoading: loadingCnics } = useQuery<AuthorizedCnic[]>({
    queryKey: ["/api/admin/authorized-cnics"],
    queryFn: () => apiRequest("GET", "/api/admin/authorized-cnics").then(res => res.json()),
  });

  // Mutation for admin registration
  const registerAdminMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/register", {
        ...data,
        isAdmin: true,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Admin account created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/exists"] });
    },
    onError: (error: Error) => {
      setFormError(error.message);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for adding authorized CNIC
  const addCnicMutation = useMutation({
    mutationFn: async (data: { cnic: string }) => {
      const res = await apiRequest("POST", "/api/admin/authorized-cnics", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "CNIC authorized successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/authorized-cnics"] });
      cnicForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for removing authorized CNIC
  const removeCnicMutation = useMutation({
    mutationFn: async (cnic: string) => {
      await apiRequest("DELETE", `/api/admin/authorized-cnics/${cnic}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "CNIC authorization revoked" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/authorized-cnics"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (checkingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If no admin exists, show registration form
  if (!adminExists) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-background/95">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Admin Registration</CardTitle>
          </CardHeader>
          <CardContent>
            {formError && (
              <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 rounded-md">
                {formError}
              </div>
            )}
            <Form {...adminForm}>
              <form onSubmit={adminForm.handleSubmit((data) => registerAdminMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={adminForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={adminForm.control}
                  name="cnic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNIC</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="13 digit CNIC without dashes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={adminForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={registerAdminMutation.isPending}
                >
                  {registerAdminMutation.isPending ? "Creating Admin Account..." : "Register as Admin"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If not logged in or not an admin, redirect to login
  // if (!user?.isAdmin) {
  //   return <Redirect to="/auth" />;
  // }

  // Admin dashboard for managing authorized CNICs
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95 p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Admin Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Authorize New CNIC</h3>
            <Form {...cnicForm}>
              <form onSubmit={cnicForm.handleSubmit((data) => addCnicMutation.mutate(data))} className="flex gap-4">
                <div className="flex-1">
                  <FormField
                    control={cnicForm.control}
                    name="cnic"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input {...field} placeholder="Enter 13 digit CNIC without dashes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" disabled={addCnicMutation.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add CNIC
                </Button>
              </form>
            </Form>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Authorized CNICs</h3>
            {loadingCnics ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : authorizedCnics?.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No authorized CNICs yet
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {authorizedCnics?.map((auth) => (
                  <div
                    key={auth.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div>
                      <p className="font-medium">{auth.cnic}</p>
                      <p className="text-sm text-muted-foreground">
                        Added on {new Date(auth.addedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeCnicMutation.mutate(auth.cnic)}
                      disabled={removeCnicMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
