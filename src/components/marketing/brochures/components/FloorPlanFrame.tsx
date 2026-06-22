import Box from '@mui/material/Box';

interface FloorPlanFrameProps {
  src: string;
  width: number;
  height: number;
  rotate?: boolean;
  backgroundColor?: string;
}

export default function FloorPlanFrame({ src, width, height, rotate = false, backgroundColor = '#FFFFFF' }: FloorPlanFrameProps) {
  return (
    <Box sx={{ width, height, position: 'relative', overflow: 'hidden', backgroundColor, flex: 'none' }}>
      {src && (
        <Box
          component="img"
          src={src}
          alt=""
          sx={
            rotate
              ? {
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: height,
                  height: width,
                  objectFit: 'contain',
                  transform: 'translate(-50%, -50%) rotate(90deg)',
                  transformOrigin: 'center',
                }
              : { width: '100%', height: '100%', objectFit: 'contain', display: 'block' }
          }
        />
      )}
    </Box>
  );
}
