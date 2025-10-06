import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface LoaderProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  className?: string;
}

const Loader: React.FC<LoaderProps> = ({ 
  title, 
  description, 
  icon,
  className = ""
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`text-center py-16 ${className}`}
    >
      <div className="max-w-md mx-auto">
        <div className="relative mb-6">
          <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center border border-primary/20">
            {icon || <Loader2 className="w-12 h-12 text-primary animate-spin" />}
          </div>
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          {title}
        </h3>
        <p className="text-foreground-muted text-xs">
          {description}
        </p>
      </div>
    </motion.div>
  );
};

export default Loader;
