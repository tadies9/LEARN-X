export function getGradeBadgeVariant(percentage: number) {
  if (percentage >= 90) return 'default';
  if (percentage >= 80) return 'secondary';
  if (percentage >= 70) return 'outline';
  return 'destructive';
}

export function getGradeColor(percentage: number) {
  if (percentage >= 90) return 'text-green-600';
  if (percentage >= 80) return 'text-blue-600';
  if (percentage >= 70) return 'text-yellow-600';
  return 'text-red-600';
}
