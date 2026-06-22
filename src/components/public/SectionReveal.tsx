import { type ReactNode } from 'react';
import Box from '@mui/material/Box';
import { motion } from 'framer-motion';

interface Props {
  children: ReactNode;
  delay?: number;
}

const MotionBox = motion.create(Box);

export default function SectionReveal({ children, delay = 0 }: Props) {
  return (
    <MotionBox
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1, margin: '0px 0px -60px 0px' }}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </MotionBox>
  );
}
