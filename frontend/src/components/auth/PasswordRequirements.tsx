import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordRequirementsProps {
  password: string;
  className?: string;
}

interface Requirement {
  test: (password: string) => boolean;
  text: string;
}

const requirements: Requirement[] = [
  { 
    test: (password) => password.length >= 8, 
    text: 'At least 8 characters' 
  },
  { 
    test: (password) => /[A-Z]/.test(password), 
    text: 'One uppercase letter' 
  },
  { 
    test: (password) => /[a-z]/.test(password), 
    text: 'One lowercase letter' 
  },
  { 
    test: (password) => /[0-9]/.test(password), 
    text: 'One number' 
  },
];

export function PasswordRequirements({ password, className }: PasswordRequirementsProps) {
  if (!password) return null;

  return (
    <ul className={cn("text-xs space-y-1 mt-2", className)}>
      {requirements.map((req, i) => {
        const passes = req.test(password);
        return (
          <li
            key={i}
            className={cn(
              "flex items-center gap-1",
              passes ? 'text-green-600' : 'text-muted-foreground'
            )}
          >
            {passes ? (
              <Check className="h-3 w-3" />
            ) : (
              <X className="h-3 w-3" />
            )}
            {req.text}
          </li>
        );
      })}
    </ul>
  );
}

export function checkPasswordStrength(password: string): boolean {
  return requirements.every(req => req.test(password));
}