import { useState, useCallback, useRef, useEffect } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Skeleton from '@mui/material/Skeleton';
import Badge from '@mui/material/Badge';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import UploadDropzone, { type ValidatedFile } from '../../components/media/UploadDropzone';
import UploadProgress, { type UploadFileState } from '../../components/media/UploadProgress';
import MediaCard from '../../components/media/MediaCard';
import MediaEditDialog from '../../components/media/MediaEditDialog';
import PosterFrameDialog from '../../components/media/PosterFrameDialog';
import { useListing } from '../../hooks/useListings';
import { useMedia, useUploadMedia, useDeleteMedia, useUpdateMedia, useReorderMedia, useSetHero, getMaxSortOrder } from '../../hooks/useMedia';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { createConcurrencyPool } from '../../utils/concurrencyPool';
import type { MediaAsset, MediaKind } from '../../types/database';

type FilterTab = 'all' | 'photo' | 'video' | 'document' | 'floor_plan';

function generateThumbnail(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxWidth = 400;
      const scale = Math.min(1, maxWidth / img.naturalWidth);
      const width = Math.round(img.naturalWidth * scale);
      const height = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (blob) resolve({ blob, width: img.naturalWidth, height: img.naturalHeight });
          else reject(new Error('Failed to generate thumbnail'));
        },
        'image/webp',
        0.75
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

function generateLargeVariant(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxWidth = 1600;
      if (img.naturalWidth <= maxWidth) {
        URL.revokeObjectURL(url);
        resolve(null);
        return;
      }
      const scale = maxWidth / img.naturalWidth;
      const width = Math.round(img.naturalWidth * scale);
      const height = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => { URL.revokeObjectURL(url); resolve(blob); },
        'image/webp',
        0.85
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

function getVideoMetadata(file: File): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      resolve({ width: video.videoWidth, height: video.videoHeight, duration: video.duration });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to read video metadata')); };
    video.src = url;
  });
}

function captureVideoPoster(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.onloadedmetadata = () => {
      // Seek to 2.5s or 10% of duration — skips fade-ins, works on short clips
      video.currentTime = Math.min(2.5, Math.max(0, video.duration * 0.1));
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) { URL.revokeObjectURL(url); resolve(null); return; }
        ctx.drawImage(video, 0, 0);
        canvas.toBlob(
          (blob) => { URL.revokeObjectURL(url); resolve(blob); },
          'image/webp',
          0.75
        );
      } catch {
        URL.revokeObjectURL(url);
        resolve(null);
      }
    };
    video.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    video.src = url;
  });
}

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

async function capturePdfThumbnail(file: File): Promise<Blob | null> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const maxWidth = 400;
    const viewport = page.getViewport({ scale: 1 });
    const scale = Math.min(1, maxWidth / viewport.width);
    const scaled = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(scaled.width);
    canvas.height = Math.round(scaled.height);
    await page.render({ canvas, viewport: scaled }).promise;
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/webp', 0.75);
    });
  } catch {
    return null;
  }
}

export default function MediaManagerPage() {
  const { id: listingId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { data: listing, isLoading: listingLoading } = useListing(listingId);
  const { data: media = [], isLoading: mediaLoading } = useMedia(listingId);
  const uploadMedia = useUploadMedia(listingId!);
  const deleteMedia = useDeleteMedia(listingId!);
  const updateMedia = useUpdateMedia(listingId!);
  const reorderMedia = useReorderMedia(listingId!);
  const setHero = useSetHero(listingId!);

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [uploadFiles, setUploadFiles] = useState<UploadFileState[]>([]);
  const [editAsset, setEditAsset] = useState<MediaAsset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null);
  const [posterTarget, setPosterTarget] = useState<MediaAsset | null>(null);
  const [showDropzone, setShowDropzone] = useState(true);
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  useEffect(() => {
    return () => {
      abortControllers.current.forEach((c) => c.abort());
      if (uploadPoolRef.current) uploadPoolRef.current.cancelAll();
    };
  }, []);

  const filteredMedia = activeTab === 'all' ? media : media.filter((m) => m.kind === activeTab);

  const counts: Record<FilterTab, number> = {
    all: media.length,
    photo: media.filter((m) => m.kind === 'photo').length,
    video: media.filter((m) => m.kind === 'video').length,
    document: media.filter((m) => m.kind === 'document').length,
    floor_plan: media.filter((m) => m.kind === 'floor_plan').length,
  };

  const uploadPoolRef = useRef<ReturnType<typeof createConcurrencyPool> | null>(null);
  const nextSortOrderRef = useRef<number | null>(null);
  const batchMetaRef = useRef<{ fileCount: { value: number }; totalSize: { value: number } } | null>(null);

  const processUpload = useCallback(async (fileState: UploadFileState, kind: MediaKind, sortOrder?: number) => {
    const { file, id } = fileState;
    const controller = new AbortController();
    abortControllers.current.set(id, controller);

    try {
      setUploadFiles((prev) => prev.map((f) => f.id === id ? { ...f, status: 'uploading' as const } : f));

      let thumbnailBlob: Blob | null = null;
      let largeBlob: Blob | null = null;
      let width: number | null = null;
      let height: number | null = null;
      let durationSeconds: number | null = null;

      if (kind === 'photo' || kind === 'floor_plan') {
        try {
          const thumbData = await generateThumbnail(file);
          thumbnailBlob = thumbData.blob;
          width = thumbData.width;
          height = thumbData.height;
        } catch { /* proceed without thumbnail */ }
        try {
          largeBlob = await generateLargeVariant(file);
        } catch { /* proceed without large variant */ }
      } else if (kind === 'video') {
        try {
          const meta = await getVideoMetadata(file);
          width = meta.width;
          height = meta.height;
          durationSeconds = meta.duration;
        } catch { /* proceed without metadata */ }
        try {
          thumbnailBlob = await captureVideoPoster(file);
        } catch { /* proceed without poster */ }
      } else if (kind === 'document') {
        try {
          thumbnailBlob = await capturePdfThumbnail(file);
        } catch { /* proceed without thumbnail */ }
      }

      await uploadMedia.mutateAsync({
        file,
        kind,
        uploadedBy: user!.id,
        thumbnailBlob,
        largeBlob,
        width,
        height,
        durationSeconds,
        sortOrder,
        onProgress: (event) => {
          setUploadFiles((prev) => prev.map((f) => f.id === id ? { ...f, progress: event.percent } : f));
        },
        abortSignal: controller.signal,
      });

      setUploadFiles((prev) => prev.map((f) => f.id === id ? { ...f, status: 'complete' as const, progress: 100 } : f));
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setUploadFiles((prev) => prev.filter((f) => f.id !== id));
      } else {
        setUploadFiles((prev) => prev.map((f) => f.id === id ? { ...f, status: 'error' as const, error: String(err) } : f));
      }
    } finally {
      abortControllers.current.delete(id);
    }
  }, [uploadMedia, user]);

  const handleFilesAccepted = useCallback(async (validatedFiles: ValidatedFile[]) => {
    const newFiles: UploadFileState[] = validatedFiles.map((vf) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file: vf.file,
      status: 'queued' as const,
      progress: 0,
    }));

    setUploadFiles((prev) => [...prev, ...newFiles]);

    if (nextSortOrderRef.current === null) {
      const currentMax = await getMaxSortOrder(listingId!);
      nextSortOrderRef.current = currentMax + 1;
    }

    let pool = uploadPoolRef.current;
    if (!pool) {
      pool = createConcurrencyPool(4);
      uploadPoolRef.current = pool;
      const batchStart = Date.now();
      const batchFileCount = { value: 0 };
      const batchTotalSize = { value: 0 };
      pool.drain().then(() => {
        if (uploadPoolRef.current === pool) {
          uploadPoolRef.current = null;
          nextSortOrderRef.current = null;
          const duration = ((Date.now() - batchStart) / 1000).toFixed(1);
          const sizeMb = (batchTotalSize.value / (1024 * 1024)).toFixed(1);
          showToast(`Upload complete: ${batchFileCount.value} file${batchFileCount.value === 1 ? '' : 's'} (${sizeMb} MB) in ${duration}s`);
        }
      });
      batchMetaRef.current = { fileCount: batchFileCount, totalSize: batchTotalSize };
    }

    if (batchMetaRef.current) {
      batchMetaRef.current.fileCount.value += validatedFiles.length;
      batchMetaRef.current.totalSize.value += validatedFiles.reduce((sum, vf) => sum + vf.file.size, 0);
    }

    validatedFiles.forEach((vf, i) => {
      const sortOrder = nextSortOrderRef.current! + i;
      pool!.add(() => processUpload(newFiles[i], vf.kind, sortOrder));
    });
    nextSortOrderRef.current! += validatedFiles.length;
  }, [processUpload, listingId, showToast]);

  const handleCancelUpload = useCallback((id: string) => {
    const controller = abortControllers.current.get(id);
    if (controller) controller.abort();
  }, []);

  const handleCancelAll = useCallback(() => {
    if (uploadPoolRef.current) uploadPoolRef.current.cancelAll();
    uploadPoolRef.current = null;
    nextSortOrderRef.current = null;
    batchMetaRef.current = null;
    abortControllers.current.forEach((controller) => controller.abort());
    abortControllers.current.clear();
    setUploadFiles([]);
  }, []);

  const handleRetryUpload = useCallback((id: string) => {
    const fileState = uploadFiles.find((f) => f.id === id);
    if (!fileState) return;
    const kind = fileState.file.type.startsWith('video/') ? 'video' : fileState.file.type === 'application/pdf' ? 'document' : 'photo';
    setUploadFiles((prev) => prev.map((f) => f.id === id ? { ...f, status: 'queued' as const, progress: 0, error: undefined } : f));
    processUpload({ ...fileState, status: 'queued', progress: 0 }, kind as MediaKind);
  }, [uploadFiles, processUpload]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMedia.mutateAsync({ id: deleteTarget.id, key: deleteTarget.original_key });
      showToast(`${deleteTarget.filename_original} deleted`);
    } catch {
      showToast('Failed to delete file', 'error');
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteMedia, showToast]);

  const handleEditSave = useCallback(async (fields: { caption: string | null; alt_text: string | null; is_public: boolean; kind?: MediaKind }) => {
    if (!editAsset) return;
    try {
      await updateMedia.mutateAsync({ id: editAsset.id, fields });
      showToast('Details updated');
    } catch {
      showToast('Failed to update details', 'error');
    }
    setEditAsset(null);
  }, [editAsset, updateMedia, showToast]);

  const handleSetHero = useCallback(async (asset: MediaAsset) => {
    try {
      await setHero.mutateAsync(asset.id);
      showToast(`${asset.filename_original} set as hero image`);
    } catch {
      showToast('Failed to set hero image', 'error');
    }
  }, [setHero, showToast]);

  const handleTogglePublic = useCallback(async (asset: MediaAsset) => {
    try {
      await updateMedia.mutateAsync({ id: asset.id, fields: { is_public: !asset.is_public } });
      showToast(asset.is_public ? 'Made private' : 'Made public');
    } catch {
      showToast('Failed to update visibility', 'error');
    }
  }, [updateMedia, showToast]);

  const handleDragStart = useCallback((id: string) => (e: React.DragEvent) => {
    setDragSourceId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  }, []);

  const handleDragOver = useCallback((id: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== dragSourceId) setDragTargetId(id);
  }, [dragSourceId]);

  const handleDrop = useCallback((targetId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragTargetId(null);
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) return;

    const ids = filteredMedia.map((m) => m.id);
    const sourceIndex = ids.indexOf(sourceId);
    const targetIndex = ids.indexOf(targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    ids.splice(sourceIndex, 1);
    ids.splice(targetIndex, 0, sourceId);
    reorderMedia.mutate(ids);
  }, [filteredMedia, reorderMedia]);

  const handleDragEnd = useCallback(() => {
    setDragSourceId(null);
    setDragTargetId(null);
  }, []);

  if (listingLoading || mediaLoading) {
    return (
      <Box>
        <Skeleton width={120} height={36} sx={{ mb: 2 }} />
        <Skeleton width="40%" height={40} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(auto-fill, minmax(200px, 1fr))' }, gap: 2 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={200} />
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(`/dashboard/listings/${listingId}`)}
        sx={{ mb: 2 }}
      >
        Back to Listing
      </Button>

      <PageHeader
        title="Media Manager"
        description={listing?.address_line_1 || 'Listing'}
        action={
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={() => setShowDropzone((v) => !v)}
          >
            Upload
          </Button>
        }
      />

      {showDropzone && (
        <Box sx={{ mb: 3 }}>
          <UploadDropzone
            onFilesAccepted={handleFilesAccepted}
            kindOverride={activeTab === 'floor_plan' ? 'floor_plan' : undefined}
          />
        </Box>
      )}

      {uploadFiles.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <UploadProgress
            files={uploadFiles}
            onCancel={handleCancelUpload}
            onCancelAll={handleCancelAll}
            onRetry={handleRetryUpload}
            onDismiss={() => setUploadFiles([])}
          />
        </Box>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab value="all" label={<Badge badgeContent={counts.all} color="primary" max={999}>All</Badge>} />
          <Tab value="photo" label={<Badge badgeContent={counts.photo} color="primary" max={999}>Photos</Badge>} />
          <Tab value="video" label={<Badge badgeContent={counts.video} color="primary" max={999}>Videos</Badge>} />
          <Tab value="document" label={<Badge badgeContent={counts.document} color="primary" max={999}>Documents</Badge>} />
          <Tab value="floor_plan" label={<Badge badgeContent={counts.floor_plan} color="primary" max={999}>Floor Plans</Badge>} />
        </Tabs>
      </Box>

      {filteredMedia.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <PhotoLibraryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No media uploaded yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Drag and drop files above or click the upload button to get started.
          </Typography>
          <Button variant="outlined" startIcon={<CloudUploadIcon />} onClick={() => setShowDropzone(true)}>
            Upload Files
          </Button>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          {filteredMedia.map((asset) => (
            <MediaCard
              key={asset.id}
              asset={asset}
              draggable={activeTab === 'all' || activeTab === 'photo' || activeTab === 'floor_plan'}
              onDragStart={handleDragStart(asset.id)}
              onDragOver={handleDragOver(asset.id)}
              onDrop={handleDrop(asset.id)}
              onDragEnd={handleDragEnd}
              isDragTarget={dragTargetId === asset.id}
              onSetHero={() => handleSetHero(asset)}
              onEditDetails={() => setEditAsset(asset)}
              onChoosePoster={asset.kind === 'video' ? () => setPosterTarget(asset) : undefined}
              onTogglePublic={() => handleTogglePublic(asset)}
              onDelete={() => setDeleteTarget(asset)}
            />
          ))}
        </Box>
      )}

      <MediaEditDialog
        open={!!editAsset}
        asset={editAsset}
        onClose={() => setEditAsset(null)}
        onSave={handleEditSave}
        saving={updateMedia.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete File"
        message={`Are you sure you want to delete "${deleteTarget?.filename_original}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="error"
        loading={deleteMedia.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {posterTarget && (
        <PosterFrameDialog
          open={!!posterTarget}
          asset={posterTarget}
          listingId={listingId!}
          onClose={() => setPosterTarget(null)}
          onSaved={() => {
            showToast('Poster frame updated');
            setPosterTarget(null);
          }}
        />
      )}
    </Box>
  );
}
