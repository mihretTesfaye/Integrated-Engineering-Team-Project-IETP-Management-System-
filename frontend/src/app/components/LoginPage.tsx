import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { GraduationCap, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch {
      // error is already surfaced through useAuth().error
    } finally {
      setSubmitting(false);
    }
  };

  const shownError = localError || error;

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center">

        {/* Branding panel */}
        <div className="hidden md:flex flex-col items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm">
            <div className="flex items-center justify-center mb-6">
              <div className="w-20 h-20 bg-[#1F3A5F] rounded-full flex items-center justify-center">
                <GraduationCap className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-center text-[#1F3A5F] mb-1">IETP Management System</h1>
            <p className="text-center text-gray-500 text-sm">
              Integrated Engineering Team Project Platform
            </p>

            <div className="mt-6 space-y-3">
              {[
                'End-to-end project lifecycle management',
                'Role-based access for students & faculty',
                'Centralized document repository & archive',
              ].map((text) => (
                <div key={text} className="flex items-center space-x-3 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-[#10b981] rounded-full shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t pt-6">
              <p className="text-xs text-gray-400 text-center">
                Accounts are created by an administrator. If you don't have a login yet,
                ask your IETP coordinator to set one up for you.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card className="w-full shadow-lg border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-[#1F3A5F]">Welcome Back</CardTitle>
            <CardDescription>Sign in to access your dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {shownError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{shownError}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full bg-[#1F3A5F] hover:bg-[#152b47]">
                {submitting ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
