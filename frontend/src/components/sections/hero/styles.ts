import { HeroVariant } from './types';

export const variantStyles = {
  main: 'bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950',
  tesla: 'bg-black text-white',
  standard: 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-black',
  premium:
    'bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-purple-950/20 dark:to-gray-900',
  minimal: 'bg-white dark:bg-gray-900',
  cinematic:
    'relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900',
};

export const getHeadlineClass = (variant: HeroVariant) => {
  const baseClass = 'font-bold tracking-tight';

  switch (variant) {
    case 'main':
      return `${baseClass} text-5xl md:text-6xl lg:text-7xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-200 dark:to-white bg-clip-text text-transparent`;
    case 'tesla':
      return `${baseClass} text-5xl md:text-6xl lg:text-7xl`;
    case 'standard':
      return `${baseClass} text-4xl md:text-5xl lg:text-6xl text-gray-900 dark:text-white`;
    case 'premium':
      return `${baseClass} text-5xl md:text-6xl lg:text-7xl bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent`;
    case 'minimal':
      return `${baseClass} text-4xl md:text-5xl text-gray-900 dark:text-white`;
    case 'cinematic':
      return `${baseClass} text-5xl md:text-6xl lg:text-7xl text-white`;
    default:
      return `${baseClass} text-4xl md:text-5xl lg:text-6xl`;
  }
};

export const getSubheadingClass = (variant: HeroVariant) => {
  const baseClass = 'mx-auto max-w-3xl';

  switch (variant) {
    case 'main':
      return `${baseClass} text-xl md:text-2xl text-gray-600 dark:text-gray-400 leading-relaxed`;
    case 'tesla':
      return `${baseClass} text-lg md:text-xl text-gray-300 leading-relaxed`;
    case 'standard':
      return `${baseClass} text-lg md:text-xl text-gray-600 dark:text-gray-400 leading-relaxed`;
    case 'premium':
      return `${baseClass} text-xl md:text-2xl text-gray-700 dark:text-gray-300 leading-relaxed`;
    case 'minimal':
      return `${baseClass} text-lg text-gray-600 dark:text-gray-400`;
    case 'cinematic':
      return `${baseClass} text-xl md:text-2xl text-gray-300 leading-relaxed`;
    default:
      return `${baseClass} text-lg md:text-xl text-gray-600 dark:text-gray-400`;
  }
};

export const getPrimaryCTAClass = (variant: HeroVariant) => {
  switch (variant) {
    case 'tesla':
      return 'bg-white text-black hover:bg-gray-100 text-base font-medium px-6 py-3';
    case 'premium':
      return 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white';
    case 'minimal':
      return 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200';
    default:
      return '';
  }
};

export const getSecondaryCTAClass = (variant: HeroVariant) => {
  switch (variant) {
    case 'tesla':
      return 'border-white text-white hover:bg-white hover:text-black';
    default:
      return 'transition-all duration-300 hover:scale-105';
  }
};
