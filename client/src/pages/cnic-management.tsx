import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { AuthorizedCnic } from "@shared/schema";
import { insertAuthorizedCnicSchema } from "@shared/schema";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";

export default function UserPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formError, setFormError] = useState("");

  const cnicForm = useForm({
    resolver: zodResolver(insertAuthorizedCnicSchema),
    defaultValues: {
      cnic: "",
    },
  });

  const { data: authorizedCnics = [], isLoading: loadingCnics } =
    useQuery<AuthorizedCnic[]>({
      queryKey: ["/api/admin/authorized-cnics"],
      queryFn: () =>
        apiRequest("GET", "/api/admin/authorized-cnics").then((res) =>
          res.json()
        ),
    });

  const addCnicMutation = useMutation({
    mutationFn: async (data: { cnic: string }) => {
      const res = await apiRequest("POST", "/api/admin/authorized-cnics", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "CNIC authorized successfully" });
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/authorized-cnics"],
      });
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

  const removeCnicMutation = useMutation({
    mutationFn: async (cnic: string) => {
      await apiRequest("DELETE", `/api/admin/authorized-cnics/${cnic}`);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "CNIC authorization revoked" });
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/authorized-cnics"],
      });
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
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Authorized CNICs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add CNIC Form */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Authorize New CNIC</h3>
            <Form {...cnicForm}>
              <form
                onSubmit={cnicForm.handleSubmit((data) =>
                  addCnicMutation.mutate(data)
                )}
                className="flex gap-4"
              >
                <div className="flex-1">
                  <FormField
                    control={cnicForm.control}
                    name="cnic"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter 13 digit CNIC without dashes"
                          />
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

          {/* CNIC List */}
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