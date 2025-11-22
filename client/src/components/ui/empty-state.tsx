import React from 'react';
import { motion } from 'framer-motion';
import { FileQuestion, AlertCircle, Search, Inbox, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type EmptyStateType = 'empty' | 'error' | 'not-found' | 'search' | 'custom';

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'ghost';
  };
  className?: string;
}

const defaultConfigs: Record<EmptyStateType, { icon: React.ReactNode; title: string; description: string }> = {
  empty: {
    icon: <Inbox className="w-12 h-12 text-muted-foreground" />,
    title: 'No Data Available',
    description: 'There is no data to display at this time.',
  },
  error: {
    icon: <AlertCircle className="w-12 h-12 text-destructive" />,
    title: 'Something Went Wrong',
    description: 'An error occurred while loading the data. Please try again.',
  },
  'not-found': {
    icon: <FileQuestion className="w-12 h-12 text-muted-foreground" />,
    title: 'Not Found',
    description: 'The requested item could not be found.',
  },
  search: {
    icon: <Search className="w-12 h-12 text-muted-foreground" />,
    title: 'No Results Found',
    description: 'We couldn\'t find any results matching your criteria. Try adjusting your search or filters.',
  },
  custom: {
    icon: <Database className="w-12 h-12 text-muted-foreground" />,
    title: '',
    description: '',
  },
};

const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'empty',
  title,
  description,
  icon,
  action,
  className = '',
}) => {
  const config = defaultConfigs[type];
  const displayIcon = icon || config.icon;
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('text-center py-12 md:py-16', className)}
    >
      <div className="max-w-md mx-auto px-4">
        <div className="relative mb-6">
          <div
            className={cn(
              'w-24 h-24 mx-auto rounded-full flex items-center justify-center border',
              type === 'error'
                ? 'bg-destructive/10 border-destructive/20'
                : 'bg-muted/50 border-border'
            )}
          >
            {displayIcon}
          </div>
        </div>
        <h3
          className={cn(
            'text-lg md:text-xl font-semibold mb-2',
            type === 'error' ? 'text-destructive' : 'text-foreground'
          )}
        >
          {displayTitle}
        </h3>
        <p className="text-sm md:text-base text-muted-foreground mb-6">
          {displayDescription}
        </p>
        {action && (
          <Button
            onClick={action.onClick}
            variant={action.variant || 'outline'}
            className="text-sm md:text-base px-4 md:px-6"
          >
            {action.label}
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default EmptyState;

