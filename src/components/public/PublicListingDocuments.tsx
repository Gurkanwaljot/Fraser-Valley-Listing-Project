import { useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import { trackListingEvent } from '../../services/publicListingService';
import SectionReveal from './SectionReveal';
import type { MediaAsset } from '../../types/database';

interface Props {
  documents: MediaAsset[];
  listingId: string;
}

function getDocIcon(mimeType: string) {
  if (mimeType.includes('pdf')) return <PictureAsPdfIcon sx={{ fontSize: 48 }} />;
  return <DescriptionIcon sx={{ fontSize: 48 }} />;
}

export default function PublicListingDocuments({ documents, listingId }: Props) {
  const handleDownload = (doc: MediaAsset) => {
    trackListingEvent(listingId, 'document_download', { asset_id: doc.id, filename: doc.filename_original });
    if (doc.public_url) {
      window.open(doc.public_url, '_blank');
    }
  };

  return (
    <SectionReveal>
      <Typography
        variant="overline"
        sx={{ color: 'primary.main', mb: 1, display: 'block', letterSpacing: '0.15em' }}
      >
        Resources
      </Typography>
      <Typography variant="h3" sx={{ color: 'text.primary', mb: 4, fontWeight: 400 }}>
        Documents
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 1.5,
        }}
      >
        {documents.map((doc) => (
          <DocumentCard key={doc.id} doc={doc} onDownload={handleDownload} />
        ))}
      </Box>
    </SectionReveal>
  );
}

function DocumentCard({ doc, onDownload }: { doc: MediaAsset; onDownload: (doc: MediaAsset) => void }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const thumbnailUrl = doc.thumbnail_url;

  const handleLoad = useCallback(() => {
    if (imgRef.current) {
      imgRef.current.style.opacity = '1';
    }
  }, []);

  return (
    <Box
      onClick={() => onDownload(doc)}
      sx={{
        position: 'relative',
        borderRadius: 1,
        overflow: 'hidden',
        cursor: 'pointer',
        aspectRatio: '4/3',
        bgcolor: 'background.paper',
        '&:hover img': { transform: 'scale(1.02)' },
        '&:hover .doc-overlay': { opacity: 1 },
        '&:hover .doc-download': { opacity: 1, transform: 'translateY(0)' },
      }}
    >
      {thumbnailUrl ? (
        <Box
          component="img"
          ref={imgRef}
          src={thumbnailUrl}
          alt={doc.caption || doc.filename_original || 'Document'}
          loading="lazy"
          decoding="async"
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          onLoad={handleLoad}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            opacity: 0,
            userSelect: 'none',
            WebkitUserDrag: 'none',
            transition: 'opacity 0.4s ease, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      ) : (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'primary.main',
            opacity: 0.5,
          }}
        >
          {getDocIcon(doc.mime_type)}
        </Box>
      )}

      {/* Hover overlay with gradient */}
      <Box
        className="doc-overlay"
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(5,5,5,0.8) 0%, rgba(5,5,5,0.2) 50%, transparent 100%)',
          opacity: 0,
          transition: 'opacity 0.4s ease',
        }}
      />

      {/* Download icon - top right */}
      <Box
        className="doc-download"
        sx={{
          position: 'absolute',
          top: 10,
          right: 10,
          bgcolor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          borderRadius: '50%',
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'common.white',
          opacity: 0,
          transform: 'translateY(-4px)',
          transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <DownloadIcon sx={{ fontSize: 16 }} />
      </Box>

      {/* Caption at bottom */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          p: 1.5,
          background: 'linear-gradient(to top, rgba(5,5,5,0.85), transparent)',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: 'common.white',
            fontWeight: 400,
            letterSpacing: '0.02em',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {doc.caption || doc.filename_original}
        </Typography>
      </Box>
    </Box>
  );
}
