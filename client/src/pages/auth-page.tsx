import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { insertUserSchema } from "@shared/schema";
import { Redirect } from "wouter";
import { useState } from "react";

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const [formError, setFormError] = useState("");

  const loginForm = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: { 
      cnic: "",
    },
  });

  if (user) {
    return <Redirect to="/" />;
  }

  const handleLogin = async (data: any) => {
    try {
      setFormError("");
      await loginMutation.mutateAsync(data);
    } catch (error: any) {
      setFormError(error.message || "Login failed. Please try again.");
      console.error("Login error:", error);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              Item Recovery System
            </CardTitle>
          </CardHeader>
          <CardContent>
            {formError && (
              <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 rounded-md">
                {formError}
              </div>
            )}
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="cnic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNIC</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter 13 digit CNIC without dashes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Verifying..." : "Login"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div className="hidden lg:flex items-center justify-center bg-gradient-to-r from-primary/10 to-primary/5 p-8">
        <div className="max-w-md space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Find What's Lost, Return What's Found
          </h1>
          <p className="text-muted-foreground">
            Welcome to our Item Recovery System. Please enter your authorized CNIC to report lost items or help others find their belongings.
          </p>
        </div>
      </div>
    </div>
  );
}