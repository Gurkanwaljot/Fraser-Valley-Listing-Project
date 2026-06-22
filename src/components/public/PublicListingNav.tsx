import { useState, useEffect, useCallback, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { keyframes } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';

interface Section {
  id: string;
  label: string;
}

interface Props {
  sections: Section[];
  activeSection: string;
  onSectionChange: (section: string) => void;
  topOffset?: number;
}

const lineExpand = keyframes`
  0% { transform: scaleX(0); }
  100% { transform: scaleX(1); }
`;

const MotionBox = motion.create(Box);

export default function PublicListingNav({ sections, activeSection, onSectionChange, topOffset = 0 }: Props) {
  const [visible, setVisible] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const scrollLock = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollLock.current) {
        setVisible(window.scrollY > window.innerHeight * 0.7);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            onSectionChange(entry.target.id);
          }
        }
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
    );

    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [sections, onSectionChange]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const scrollTo = useCallback((id: string) => {
    setMenuOpen(false);
    scrollLock.current = true;
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        const offset = 80;
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
      setTimeout(() => { scrollLock.current = false; }, 800);
    }, 200);
  }, []);

  const currentLabel = sections.find((s) => s.id === activeSection)?.label || '';

  return (
    <>
      {/* Minimal sticky header */}
      <Box
        sx={{
          position: 'fixed',
          top: topOffset,
          left: 0,
          right: 0,
          zIndex: 'appBar',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 2.5, md: 4 },
          py: 1.5,
          bgcolor: visible ? 'rgba(5, 5, 5, 0.75)' : 'transparent',
          backdropFilter: visible ? 'blur(20px)' : 'none',
          transition: (theme) => theme.transitions.create(['background-color', 'backdrop-filter', 'opacity', 'transform'], {
            duration: theme.transitions.duration.standard,
            easing: theme.transitions.easing.easeOut,
          }),
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? 'auto' : 'none',
          transform: visible ? 'translateY(0)' : 'translateY(-8px)',
        }}
      >
        {/* Current section indicator */}
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 400,
            opacity: 0.7,
          }}
        >
          {currentLabel}
        </Typography>

        {/* Menu trigger */}
        <IconButton
          onClick={() => setMenuOpen(true)}
          disableRipple
          sx={{
            width: 40,
            height: 40,
            p: 0,
            color: 'text.primary',
            '&:hover': { bgcolor: 'transparent', color: 'primary.main' },
            transition: (theme) => theme.transitions.create('color', {
              duration: theme.transitions.duration.shorter,
            }),
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
            <Box sx={{ width: 22, height: '1.5px', bgcolor: 'currentColor', transition: 'all 0.3s' }} />
            <Box sx={{ width: 16, height: '1.5px', bgcolor: 'currentColor', transition: 'all 0.3s' }} />
          </Box>
        </IconButton>
      </Box>

      {/* Full-screen overlay menu */}
      <AnimatePresence>
        {menuOpen && (
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            sx={{
              position: 'fixed',
              inset: 0,
              zIndex: 'modal',
              bgcolor: 'rgba(5, 5, 5, 0.97)',
              backdropFilter: 'blur(30px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {/* Close button */}
            <Box
              component={motion.div}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              sx={{
                position: 'absolute',
                top: { xs: 16, md: 24 },
                right: { xs: 16, md: 32 },
              }}
            >
              <IconButton
                onClick={() => setMenuOpen(false)}
                disableRipple
                sx={{
                  width: 48,
                  height: 48,
                  color: 'text.primary',
                  '&:hover': { bgcolor: 'transparent', color: 'primary.main' },
                }}
              >
                <Box sx={{ position: 'relative', width: 24, height: 24 }}>
                  <Box sx={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: '1.5px', bgcolor: 'currentColor', transform: 'rotate(45deg)' }} />
                  <Box sx={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: '1.5px', bgcolor: 'currentColor', transform: 'rotate(-45deg)' }} />
                </Box>
              </IconButton>
            </Box>

            {/* Menu items */}
            <Box
              component="nav"
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: { xs: 3, md: 4 },
              }}
            >
              {sections.map((section, index) => (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.1 + index * 0.06,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <Typography
                    component="button"
                    onClick={() => scrollTo(section.id)}
                    variant="h4"
                    sx={{
                      all: 'unset',
                      cursor: 'pointer',
                      display: 'block',
                      position: 'relative',
                      color: activeSection === section.id ? 'primary.main' : 'text.primary',
                      fontWeight: 400,
                      letterSpacing: '0.04em',
                      fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
                      lineHeight: 1.4,
                      transition: (theme) => theme.transitions.create('color', {
                        duration: theme.transitions.duration.shorter,
                      }),
                      '&:hover': {
                        color: 'primary.main',
                      },
                      '&::after': activeSection === section.id ? {
                        content: '""',
                        position: 'absolute',
                        bottom: -4,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 24,
                        height: '1px',
                        bgcolor: 'primary.main',
                        animation: `${lineExpand} 0.4s ease-out`,
                      } : {},
                    }}
                  >
                    {section.label}
                  </Typography>
                </motion.div>
              ))}
            </Box>
          </MotionBox>
        )}
      </AnimatePresence>
    </>
  );
}
