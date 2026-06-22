import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import { motion, AnimatePresence } from 'framer-motion';

interface StepCardProps {
  stepNumber: number;
  title: string;
  expanded: boolean;
  completed: boolean;
  summary?: ReactNode;
  onEdit?: () => void;
  children: ReactNode;
}

export default function StepCard({
  stepNumber,
  title,
  expanded,
  completed,
  summary,
  onEdit,
  children,
}: StepCardProps) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        borderColor: expanded ? 'primary.main' : 'divider',
        transition: (theme) => theme.transitions.create(['border-color', 'box-shadow']),
        boxShadow: expanded ? 4 : 0,
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{ p: { xs: 2, sm: 2.5 }, cursor: completed && !expanded && onEdit ? 'pointer' : 'default' }}
        onClick={() => {
          if (completed && !expanded && onEdit) onEdit();
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: completed
              ? 'success.main'
              : expanded
                ? 'primary.main'
                : 'action.hover',
            color: completed || expanded ? 'common.white' : 'text.secondary',
            flexShrink: 0,
          }}
        >
          {completed ? (
            <CheckCircleIcon fontSize="small" />
          ) : (
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {stepNumber}
            </Typography>
          )}
        </Box>

        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            Step {stepNumber}: {title}
          </Typography>
          <AnimatePresence mode="wait">
            {completed && !expanded && summary && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <Box sx={{ mt: 0.5, color: 'text.secondary', fontSize: '0.875rem' }}>
                  {summary}
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>

        {completed && !expanded && onEdit && (
          <Button
            size="small"
            variant="text"
            startIcon={<EditIcon fontSize="small" />}
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            sx={{ flexShrink: 0 }}
          >
            Edit
          </Button>
        )}
      </Stack>

      <Collapse in={expanded} timeout={300} unmountOnExit>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: { xs: 2, sm: 2.5 }, pt: 0 }}>{children}</Box>
        </motion.div>
      </Collapse>
    </Card>
  );
}
